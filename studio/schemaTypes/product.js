// schemas/product.js
export default {
    name: 'product',
    title: 'Product',
    type: 'document',
    fields: [
      {
        name: 'title',
        title: 'Title',
        type: 'string',
      },
      {
        name: 'desc',
        title: 'Description',
        type: 'string',
      },
      {
        name: 'price',
        title: 'Price',
        type: 'number',
      },
      {
        name: 'oldPrice',
        title: 'Old Price',
        type: 'number',
      },
      {
        name: 'isNew',
        title: 'Is New Season',
        type: 'boolean',
      },
      {
        name: 'type',
        title: 'Type',
        type: 'string',
        options: {
          list: [
            {title: 'Featured', value: 'featured'},
            {title: 'Trending', value: 'trending'},
          ],
        },
      },
      {
        name: 'img',
        title: 'Image',
        type: 'image',
        options: {hotspot: true},
      },
      {
        name: 'img2',
        title: 'Second Image',
        type: 'image',
        options: {hotspot: true},
      },
      {
        name: 'categories', // Changed to plural
        title: 'Categories',
        type: 'array', // Use an array for many-to-many
        of: [{type: 'reference', to: [{type: 'category'}]}],
      },
      {
        name: 'subCategories',
        title: 'Sub-Categories',
        type: 'array',
        of: [{type: 'reference', to: [{type: 'subCategory'}]}],
      },
    ],
  }