import { Prisma } from '@prisma/client';
import prisma from '../config/prisma.js';

// GET /api/content?type=report&status=published&search=glacier&expedition_id=...
export const listContent = async (req, res) => {
  const { type, status, search, expedition_id } = req.query;

  try {
    // Full-text search still needs raw SQL (Prisma has no tsvector support)
        if (search) {
      const typeFilter = type ? Prisma.sql`AND type = ${type}::"ContentType"` : Prisma.empty;
      const rows = await prisma.$queryRaw`
        SELECT id, expedition_id, type, title, description, file_url, thumbnail_url,
               file_size_bytes, mime_type, status, uploaded_by, approved_by,
               view_count, download_count, created_at, updated_at
        FROM content_items
        WHERE search_vector @@ plainto_tsquery('english', ${search})
          AND status = ${status || 'published'}::"ContentStatus"
          ${typeFilter}
        ORDER BY created_at DESC
      `;
      return res.json(rows);
    }

    const items = await prisma.contentItem.findMany({
      where: {
        status: status || 'published',
        ...(type && { type }),
        ...(expedition_id && { expeditionId: expedition_id }),
      },
      orderBy: { createdAt: 'desc' },
      include: { expedition: true, tags: { include: { tag: true } } },
    });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/content — create new content item (draft by default)
export const createContent = async (req, res) => {
  const { expedition_id, type, title, description, file_url, thumbnail_url, mime_type, file_size_bytes } = req.body;
  try {
    const item = await prisma.contentItem.create({
      data: {
        expeditionId: expedition_id,
        type,
        title,
        description,
        fileUrl: file_url,
        thumbnailUrl: thumbnail_url,
        mimeType: mime_type,
        fileSizeBytes: file_size_bytes,
        uploadedBy: req.user.id,
        status: 'draft',
      },
    });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /api/content/:id/status — move through draft -> in_review -> published
export const updateContentStatus = async (req, res) => {
  const { status } = req.body; // 'in_review' | 'published' | 'archived'
  try {
    const item = await prisma.contentItem.update({
      where: { id: req.params.id },
      data: { status, approvedBy: req.user.id },
    });
    res.json(item);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: err.message });
  }
};

// GET /api/content/:id
// Public callers only ever see published items. Uploaders, comms_officers,
// and admins can also view their own / any non-published item (drafts,
// in_review, archived) — everyone else gets a 404 (not 403, so we don't
// confirm the id exists at all).
export const getContentById = async (req, res) => {
  try {
    const item = await prisma.contentItem.findUnique({
      where: { id: req.params.id },
      include: { expedition: true, tags: { include: { tag: true } }, aiGenerations: true },
    });
    if (!item) return res.status(404).json({ error: 'Not found' });

    const isStaff = req.user && ['admin', 'comms_officer'].includes(req.user.role);
    const isOwner = req.user && req.user.id === item.uploadedBy;

    if (item.status !== 'published' && !isStaff && !isOwner) {
      return res.status(404).json({ error: 'Not found' });
    }

    // Only bump the view count for items that are actually publicly visible,
    // so drafts/in_review being previewed by staff don't rack up fake views.
    if (item.status === 'published') {
      const updated = await prisma.contentItem.update({
        where: { id: req.params.id },
        data: { viewCount: { increment: 1 } },
      });
      item.viewCount = updated.viewCount;
    }

    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
