import prisma from '../database/connection.js';

// posStatus='pending' — Clopos navbati shu yozuvni oladi (buyurtma bilan bir
// vaqtda saqlanadi, alohida "vazifa" yo'qolib qolmaydi)
export const createOrder = ({ userId, items, total, location, phone, posStatus }) =>
  prisma.order.create({
    data: {
      userId,
      items,
      total: Number(total),
      location: location || null,
      phone: phone || null,
      posStatus: posStatus || null,
    },
  });

// Admin uchun: barcha buyurtmalar (mijoz ma'lumoti bilan)
export const getAllOrders = () =>
  prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    include: { user: true },
  });

// Mijozning o'z buyurtmalari
export const getOrdersByUser = (userId) =>
  prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

export const updateOrderStatus = (id, status) =>
  prisma.order.update({
    where: { id: Number(id) },
    data: { status },
  });

export const getOrderById = (id) =>
  prisma.order.findUnique({ where: { id: Number(id) } });

export const setOrderCourier = (id, courier) =>
  prisma.order.update({
    where: { id: Number(id) },
    data: { courier },
  });
