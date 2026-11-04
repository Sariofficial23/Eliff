import prisma from '../database/connection.js';

// Clopos ID: musbat butun son yoki null (bo'sh maydon — bog'lanmagan)
const cloposIdOf = (v) => {
  const n = Number(v);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
};

export const getAllProducts = () =>
  prisma.product.findMany({ orderBy: { id: 'asc' } });

export const getProductById = (id) =>
  prisma.product.findUnique({ where: { id: Number(id) } });

export const createProduct = (data) =>
  prisma.product.create({
    data: {
      image: data.image,
      name: data.name,
      description: data.description,
      oldPrice: data.oldPrice ? Number(data.oldPrice) : null,
      newPrice: Number(data.newPrice),
      category: data.category,
      cloposId: cloposIdOf(data.cloposId),
    },
  });

export const updateProduct = (id, data) =>
  prisma.product.update({
    where: { id: Number(id) },
    data: {
      image: data.image,
      name: data.name,
      description: data.description,
      oldPrice: data.oldPrice ? Number(data.oldPrice) : null,
      newPrice: Number(data.newPrice),
      category: data.category,
      // Forma cloposId yubormasa — mavjud bog'lanish saqlanadi
      ...(data.cloposId !== undefined ? { cloposId: cloposIdOf(data.cloposId) } : {}),
    },
  });

export const deleteProduct = (id) =>
  prisma.product.delete({ where: { id: Number(id) } });
