import prisma from '../config/prisma.js';

// GET /api/expeditions?region=Arctic&pi=<user_id>&page=1&limit=20
export const listExpeditions = async (req, res) => {
  const { region, pi, page, limit } = req.query;

  try {
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where = {
      ...(region && { region }),
      ...(pi && { principalInvestigator: pi }),
    };

    const [expeditions, total] = await Promise.all([
      prisma.expedition.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { startDate: 'desc' },
        include: {
          pi: {
            select: { id: true, name: true, email: true, organization: true },
          },
          _count: {
            select: { contentItems: true },
          },
        },
      }),
      prisma.expedition.count({ where }),
    ]);

    res.json({
      expeditions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/expeditions/:id
export const getExpeditionById = async (req, res) => {
  try {
    const expedition = await prisma.expedition.findUnique({
      where: { id: req.params.id },
      include: {
        pi: {
          select: { id: true, name: true, email: true, organization: true },
        },
        contentItems: {
          select: { id: true, title: true, type: true, status: true },
        },
      },
    });

    if (!expedition) {
      return res.status(404).json({ error: 'Expedition not found' });
    }

    res.json(expedition);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/expeditions
export const createExpedition = async (req, res) => {
  const {
    name,
    region,
    description,
    start_date,
    end_date,
    latitude,
    longitude,
    principal_investigator,
  } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    const expedition = await prisma.expedition.create({
      data: {
        name: name.trim(),
        region,
        description,
        startDate: start_date ? new Date(start_date) : null,
        endDate: end_date ? new Date(end_date) : null,
        latitude,
        longitude,
        principalInvestigator: principal_investigator,
      },
      include: {
        pi: {
          select: { id: true, name: true, email: true, organization: true },
        },
      },
    });

    res.status(201).json(expedition);
  } catch (err) {
    if (err.code === 'P2003') {
      return res.status(400).json({ error: 'Invalid principal investigator ID' });
    }
    res.status(500).json({ error: err.message });
  }
};

// PATCH /api/expeditions/:id
export const updateExpedition = async (req, res) => {
  const {
    name,
    region,
    description,
    start_date,
    end_date,
    latitude,
    longitude,
    principal_investigator,
  } = req.body;

  if (name !== undefined && (!name || !name.trim())) {
    return res.status(400).json({ error: 'Name cannot be empty' });
  }

  try {
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (region !== undefined) updateData.region = region;
    if (description !== undefined) updateData.description = description;
    if (start_date !== undefined) updateData.startDate = start_date ? new Date(start_date) : null;
    if (end_date !== undefined) updateData.endDate = end_date ? new Date(end_date) : null;
    if (latitude !== undefined) updateData.latitude = latitude;
    if (longitude !== undefined) updateData.longitude = longitude;
    if (principal_investigator !== undefined) updateData.principalInvestigator = principal_investigator;

    const expedition = await prisma.expedition.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        pi: {
          select: { id: true, name: true, email: true, organization: true },
        },
      },
    });

    res.json(expedition);
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Expedition not found' });
    }
    if (err.code === 'P2003') {
      return res.status(400).json({ error: 'Invalid principal investigator ID' });
    }
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/expeditions/:id
export const deleteExpedition = async (req, res) => {
  try {
    const contentCount = await prisma.contentItem.count({
      where: { expeditionId: req.params.id },
    });

    if (contentCount > 0) {
      return res.status(409).json({
        error: 'Cannot delete expedition with associated content items',
        contentItemCount: contentCount,
      });
    }

    await prisma.expedition.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Expedition deleted successfully' });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Expedition not found' });
    }
    res.status(500).json({ error: err.message });
  }
};
