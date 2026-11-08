// schemas/order.js
export default {
    name: 'order',
    title: 'Order',
    type: 'document',
    fields: [
      {
        name: 'customerName',
        title: 'Customer Name',
        type: 'string',
      },
      {
        name: 'customerEmail',
        title: 'Customer Email',
        type: 'string',
      },
      {
        name: 'products',
        title: 'Products',
        type: 'array',
        of: [
          {
            type: 'object',
            fields: [
              {name: 'title', type: 'string'},
              {name: 'quantity', type: 'number'},
              {name: 'price', type: 'number'},
            ],
          },
        ],
      },
      {
        name: 'stripeId',
        title: 'Stripe ID',
        type: 'string',
      },
    ],
  }