# affiliate

- **Object type name:** `affiliate`
- **Object description:** Affiliate or referral product/offer with tracking and geo.

- **supported_updates**

[`affiliate_button`](../object-updates/affiliate_button.md)
[`affiliate_product_id_types`](../object-updates/affiliate_product_id_types.md)
[`affiliate_geo_area`](../object-updates/affiliate_geo_area.md)
[`affiliate_url_template`](../object-updates/affiliate_url_template.md)
[`affiliate_code`](../object-updates/affiliate_code.md)
[`parent`](../object-updates/parent.md)
[`name`](../object-updates/name.md)
[`description`](../object-updates/description.md)
[`rating`](../object-updates/rating.md)
[`tag_category`](../object-updates/tag_category.md)
[`category_item`](../object-updates/category_item.md)
[`gallery_album`](../object-updates/gallery_album.md)
[`gallery_item`](../object-updates/gallery_item.md)
[`pin`](../object-updates/pin.md)
[`remove`](../object-updates/remove.md)
[`avatar`](../object-updates/avatar.md)
[`title`](../object-updates/title.md)
[`background`](../object-updates/background.md)
[`status`](../object-updates/status.md)
[`delegation`](../object-updates/delegation.md)
[`promotion`](../object-updates/promotion.md)

- **supposed_updates**

`rating`: "Commissions", "Payments"
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
            object_id: 'affiliate1',
            object_type: 'affiliate'
          }
        }
      ]
    }),
  },
]

```
