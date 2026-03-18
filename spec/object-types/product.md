# product

- **Object type name:** `product`
- **Object description:** Product or sellable item with catalog fields.

- **supported_updates**

[`add_on`](../object-updates/add_on.md)
[`avatar`](../object-updates/avatar.md)
[`background`](../object-updates/background.md)
[`blog`](../object-updates/blog.md)
[`brand`](../object-updates/brand.md)
[`button`](../object-updates/button.md)
[`category_item`](../object-updates/category_item.md)
[`compare_at_price`](../object-updates/compare_at_price.md)
[`delegation`](../object-updates/delegation.md)
[`departments`](../object-updates/departments.md)
[`description`](../object-updates/description.md)
[`dimensions`](../object-updates/dimensions.md)
[`features`](../object-updates/features.md)
[`form`](../object-updates/form.md)
[`gallery_album`](../object-updates/gallery_album.md)
[`gallery_item`](../object-updates/gallery_item.md)
[`group_id`](../object-updates/group_id.md)
[`identifier`](../object-updates/identifier.md)
[`list_item`](../object-updates/list_item.md)
[`manufacturer`](../object-updates/manufacturer.md)
[`menu_item`](../object-updates/menu_item.md)
[`merchant`](../object-updates/merchant.md)
[`name`](../object-updates/name.md)
[`news_filter`](../object-updates/news_filter.md)
[`options`](../object-updates/options.md)
[`parent`](../object-updates/parent.md)
[`pin`](../object-updates/pin.md)
[`price`](../object-updates/price.md)
[`product_weight`](../object-updates/product_weight.md)
[`promotion`](../object-updates/promotion.md)
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

`rating`: "Quality", "Value"
`tag_category`: "Category", "Pros", "Cons"

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
            object_id: 'product1',
            object_type: 'product'
          }
        }
      ]
    }),
  },
]

```
