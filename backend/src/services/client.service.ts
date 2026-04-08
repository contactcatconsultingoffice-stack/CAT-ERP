import { prisma } from '../prisma';

export class ClientService {
  static async findAll(params: { page: number; limit: number; search?: string }) {
    const { page, limit, search } = params;
    const skip = (page - 1) * limit;

    const where: any = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { contact: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ]
    } : {};

    const [data, totalCount] = await Promise.all([
      prisma.client.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: limit
      }),
      prisma.client.count({ where })
    ]);

    return {
      data,
      totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit)
    };
  }

  static async findById(id: string) {
    return prisma.client.findUnique({ where: { id } });
  }

  static async create(data: { name: string; contact?: string; email?: string; phone?: string }) {
    return prisma.client.create({ data });
  }

  static async update(id: string, data: { name?: string; contact?: string; email?: string; phone?: string }) {
    return prisma.client.update({
      where: { id },
      data
    });
  }

  static async delete(id: string) {
    return prisma.client.delete({ where: { id } });
  }

  static async getAllForExport() {
    return prisma.client.findMany({
      orderBy: { name: 'asc' }
    });
  }
}
