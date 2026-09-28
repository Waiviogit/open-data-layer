import * as enUS from '../../../../i18n/locales/en-US.json';

describe('Object edit UI i18n keys (en-US)', () => {
  it('defines all keys used by add-update modal and left rail', () => {
    const keys = [
      'object_edit_add_update',
      'object_edit_view_field_updates',
      'object_edit_modal_title',
      'object_edit_select_type',
      'object_edit_suggest_field',
      'object_edit_submit',
      'object_edit_submitting',
      'object_edit_value_label',
      'object_edit_locale_label',
      'object_updates_all_locales',
      'object_edit_cancel',
      'object_edit_validation_error',
      'object_edit_menu_item_title',
      'object_edit_menu_item_style',
      'object_edit_menu_item_image',
      'object_edit_menu_item_link_type',
      'object_edit_menu_item_link_object',
      'object_edit_menu_item_link_web',
      'object_edit_delegation_search_placeholder',
      'object_edit_delegation_clear_user',
      'object_edit_menu_item_search_placeholder',
      'object_edit_menu_item_searching',
      'object_edit_menu_item_no_results',
      'object_edit_menu_item_clear_object',
      'object_edit_style_standard',
      'object_edit_style_highlight',
      'object_edit_style_icon',
      'object_edit_style_image',
      'object_edit_tag_item_category',
      'object_edit_tag_item_value',
      'object_edit_tag_item_no_categories',
      'object_edit_geo_map_hint',
      'object_edit_wallet_symbol',
      'object_edit_wallet_address',
      'object_edit_wallet_title',
      'object_edit_address_line1',
      'object_edit_address_line2',
      'object_edit_link_platform',
      'object_edit_link_profile',
      'location_city',
      'stateProvince',
      'postalCode',
      'location_country',
    ] as const;

    for (const key of keys) {
      const value = enUS[key];
      expect(typeof value).toBe('string');
      expect((value as string).length).toBeGreaterThan(0);
    }
  });
});

describe('Update card decisive vote i18n keys (en-US)', () => {
  it('defines privileged vote label keys used by UpdateCard', () => {
    const keys = [
      'object_updates_approved_by_admin',
      'object_updates_rejected_by_admin',
      'object_updates_approved_by_trusted',
      'object_updates_rejected_by_trusted',
      'object_updates_transaction',
    ] as const;

    for (const key of keys) {
      const value = enUS[key];
      expect(typeof value).toBe('string');
      expect((value as string).length).toBeGreaterThan(0);
    }
  });
});

describe('Update raw JSON toggle i18n keys (en-US)', () => {
  it('defines view/hide JSON keys used by UpdateRawJsonToggle', () => {
    const keys = ['object_updates_view_json', 'object_updates_hide_json'] as const;

    for (const key of keys) {
      const value = enUS[key];
      expect(typeof value).toBe('string');
      expect((value as string).length).toBeGreaterThan(0);
    }
  });
});
