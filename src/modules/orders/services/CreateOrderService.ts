import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import { request } from 'express';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,
    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,
    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) { }

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customerExists = await this.customersRepository.findById(customer_id);

    if (!customerExists) {
      throw new AppError('User does not exist.');
    }
    // const product_ids = products.filter(p => {
    //   return
    // });

    const product_ids = [];
    for (const i in products) {
      product_ids.push({ id: products[i].id, });

    }
    const productsExist = await this.productsRepository.findAllById(product_ids);

    if (!productsExist.length) {
      throw new AppError('Products does not exist.');
    }

    const existingProductsIds = productsExist.map(product => product.id);

    const nonExistingProducts = products.filter(
      product => !existingProductsIds.includes(product.id),
    );

    if (nonExistingProducts.length) {
      throw new AppError(
        'Some products could not be found, order not accepted.',
      );
    }

    const findIfQuantityEnough = products.filter(
      product => productsExist.filter(p => p.id === product.id)[0].quantity < product.quantity,
    );

    if (findIfQuantityEnough.length) {
      throw new AppError('Products have unsuficient quantity')
    }

    const productsToSave = products.map(product => ({
      product_id: product.id,
      quantity: product.quantity,
      price: productsExist.filter(p => p.id === product.id)[0].price,
    }));

    const remainingProductQuantity = products.map(product => ({
      id: product.id,
      quantity: productsExist.filter(p => p.id === product.id)[0].quantity - product.quantity,
    }));

    await this.productsRepository.updateQuantity(remainingProductQuantity);

    const orderProducctQuantity = 0;

    const createOrder = await this.ordersRepository.create({
      customer: customerExists,
      products: productsToSave,
    });
    return createOrder;
  }
}

export default CreateOrderService;
