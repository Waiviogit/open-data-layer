# book

- **Object type name:** `book`
- **Object purpose:** Book or publication with metadata, authors, and commerce.

- **supported_updates**

[`status`](../object-updates/status.md)
[`avatar`](../object-updates/avatar.md)
[`name`](../object-updates/name.md)
[`title`](../object-updates/title.md)
[`background`](../object-updates/background.md)
[`parent`](../object-updates/parent.md)
[`tag_category`](../object-updates/tag_category.md)
[`category_item`](../object-updates/category_item.md)
[`gallery_album`](../object-updates/gallery_album.md)
[`list_item`](../object-updates/list_item.md)
[`button`](../object-updates/button.md)
[`news_filter`](../object-updates/news_filter.md)
[`sort_custom`](../object-updates/sort_custom.md)
[`rating`](../object-updates/rating.md)
[`price`](../object-updates/price.md)
[`description`](../object-updates/description.md)
[`website`](../object-updates/website.md)
[`blog`](../object-updates/blog.md)
[`form`](../object-updates/form.md)
[`identifier`](../object-updates/identifier.md)
[`gallery_item`](../object-updates/gallery_item.md)
[`age_range`](../object-updates/age_range.md)
[`group_id`](../object-updates/group_id.md)
[`options`](../object-updates/options.md)
[`publication_date`](../object-updates/publication_date.md)
[`language`](../object-updates/language.md)
[`product_weight`](../object-updates/product_weight.md)
[`dimensions`](../object-updates/dimensions.md)
[`authors`](../object-updates/authors.md)
[`publisher`](../object-updates/publisher.md)
[`print_length`](../object-updates/print_length.md)
[`departments`](../object-updates/departments.md)
[`pin`](../object-updates/pin.md)
[`remove`](../object-updates/remove.md)
[`menu_item`](../object-updates/menu_item.md)
[`related`](../object-updates/related.md)
[`add_on`](../object-updates/add_on.md)
[`similar`](../object-updates/similar.md)
[`delegation`](../object-updates/delegation.md)
[`promotion`](../object-updates/promotion.md)
[`sale`](../object-updates/sale.md)
[`compare_at_price`](../object-updates/compare_at_price.md)

- **supposed_updates**

`departments`: "Books"
`rating`: "Rating"
`tag_category`: "Tags"

- **Example payload for broadcast**

```js
[
  'custom_json',
  {
    required_auths: [],
    required_posting_auths: [account],
    id: 'odl-mainnet',
    json: JSON.stringify({
      events: [
        {
          action: 'object_create',
          v: 1,
          payload: {
            object_id: 'book1',
            object_type: 'book'
          }
        }
      ]
    }),
  },
]

```
