# book

- **Object type name:** `book`
- **Object description:** Book or publication with metadata, authors, and commerce.

- **supported_updates**

[`add_on`](../object-updates/add_on.md)
[`age_range`](../object-updates/age_range.md)
[`authors`](../object-updates/authors.md)
[`avatar`](../object-updates/avatar.md)
[`background`](../object-updates/background.md)
[`blog`](../object-updates/blog.md)
[`button`](../object-updates/button.md)
[`category_item`](../object-updates/category_item.md)
[`compare_at_price`](../object-updates/compare_at_price.md)
[`delegation`](../object-updates/delegation.md)
[`departments`](../object-updates/departments.md)
[`description`](../object-updates/description.md)
[`dimensions`](../object-updates/dimensions.md)
[`form`](../object-updates/form.md)
[`gallery_album`](../object-updates/gallery_album.md)
[`gallery_item`](../object-updates/gallery_item.md)
[`group_id`](../object-updates/group_id.md)
[`identifier`](../object-updates/identifier.md)
[`language`](../object-updates/language.md)
[`list_item`](../object-updates/list_item.md)
[`menu_item`](../object-updates/menu_item.md)
[`name`](../object-updates/name.md)
[`news_filter`](../object-updates/news_filter.md)
[`options`](../object-updates/options.md)
[`parent`](../object-updates/parent.md)
[`pin`](../object-updates/pin.md)
[`price`](../object-updates/price.md)
[`print_length`](../object-updates/print_length.md)
[`product_weight`](../object-updates/product_weight.md)
[`promotion`](../object-updates/promotion.md)
[`publication_date`](../object-updates/publication_date.md)
[`publisher`](../object-updates/publisher.md)
[`rating`](../object-updates/rating.md)
[`related`](../object-updates/related.md)
[`remove`](../object-updates/remove.md)
[`sale`](../object-updates/sale.md)
[`similar`](../object-updates/similar.md)
[`sort_custom`](../object-updates/sort_custom.md)
[`status`](../object-updates/status.md)
[`tag_category`](../object-updates/tag_category.md)
[`title`](../object-updates/title.md)
[`website`](../object-updates/website.md)

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
