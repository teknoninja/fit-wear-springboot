// schemas/category.js
export default {
    name: 'category',
    title: 'Category',
    type: 'document',
    fields: [
      {
        name: 'title',
        title: 'Title',
        type: 'string',
      },
      {
        name: 'image',
        title: 'Image',
        type: 'image',
        options: {hotspot: true},
      },
      {
        name: 'subCategories',
        title: 'Sub-Categories',
        type: 'array',
        of: [{type: 'reference', to: [{type: 'subCategory'}]}],
      },
    ],
  }