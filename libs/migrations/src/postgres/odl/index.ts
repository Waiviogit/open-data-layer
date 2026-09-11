import * as m00001 from './00001_odl_schema';
import * as m00002 from './00002_scheduler';
import * as m00003 from './00003_site_canonical';
import * as m00004 from './00004_rank_votes_rank_range';
import * as m00005 from './00005_object_categories';
import * as m00006 from './00006_user_metadata_shop_fields';
import * as m00007 from './00007_user_object_powers';
import * as m00008 from './00008_object_updates_rank_score';
import * as m00009 from './00009_subscription_follow_timestamps';
import * as m00010 from './00010_currency_tables';
import * as m00011 from './00011_object_status';
import * as m00012 from './00012_object_authority_created_at';
import * as m00013 from './00013_discover_indexes';
import * as m00014 from './00014_object_tag_categories';
import * as m00015 from './00015_object_tag_category_items_object_type';
import * as m00016 from './00016_waiv_power_history';
import * as m00017 from './00017_objects_core_created_at';
import * as m00018 from './00018_knowledge_tables';
import * as m00019 from './00019_knowledge_files_description';
import * as m00020 from './00020_knowledge_search_hybrid';
import * as m00021 from './00021_posts_rewards_finalized_at';
import * as m00022 from './00022_post_object_related_images';
import * as m00023 from './00023_user_metadata_hide_favorite_objects';
import * as m00024 from './00024_post_objects_author_index';
import * as m00025 from './00025_user_delegations';
import * as m00026 from './00026_wallet_exemptions';
import * as m00027 from './00027_hive_engine_swaps';
import * as m00028 from './00028_hive_engine_swaps_drop_pool_id';
import * as m00029 from './00029_hive_engine_waiv_airdrops';
import * as m00030 from './00030_hive_engine_swaps_ref_hive_block_nullable';
import * as m00031 from './00031_waiv_generated_reports';
import * as m00032 from './00032_waiv_generated_reports_merge_fold';
import * as m00033 from './00033_object_updates_name_trgm';
import * as m00034 from './00034_user_object_expertise';
import * as m00035 from './00035_hive_engine_swap_pool_usd';
import * as m00036 from './00036_objects_core_meta_group_id_index';
import * as m00037 from './00037_obl';
import * as m00038 from './00038_obl_contract_metadata';
import * as m00039 from './00039_obl_payments_contract_and_created_at';
import * as m00040 from './00040_obl_payments_declared_amount';
import * as m00041 from './00041_obl_list_indexes';
import * as m00042 from './00042_obl_arbitration_indexes';
import * as m00043 from './00043_object_status_closed_privacy_erasure';
import * as m00044 from './00044_obl_obligation_lines';
import * as m00045 from './00045_obl_service_orders_reports';
import * as m00046 from './00046_obl_contract_service_order_schema';
import * as m00047 from './00047_hive_engine_deposit_records';
import * as m00048 from './00048_telegram_subscriptions';
import * as m00049 from './00049_ops_telegram_subscribers';
import * as m00050 from './00050_user_notification_settings_columns';
import * as m00051 from './00051_posts_root_created_unix_index';
import * as m00052 from './00052_osl_channels_messages';
import * as m00053 from './00053_channel_members_last_read';
import * as m00054 from './00054_channels_dissolved_at';
import * as m00055 from './00055_osl_messages_encryption';
import * as m00056 from './00056_user_notification_settings_messages';
import * as m00057 from './00057_object_favorite_ownership';
import * as m00058 from './00058_profile_feed_read_and_replies';
import * as m00059 from './00059_object_updates_search_json_prefix';
import * as m00060 from './00060_messages_original_created_at';
import * as m00061 from './00061_messages_linked_object_ids';
import * as m00062 from './00062_user_account_auths';
import * as m00063 from './00063_user_notification_settings_obl';
import type { Migration } from 'kysely';

/** Ordered migrations for OdlMigrationProvider. Schema matches @opden-data-layer/odl-db-types OdlDatabase and docs/spec/data-model/schema.sql */
export const MIGRATIONS: Record<string, Migration> = {
  '00001_odl_schema': { up: m00001.up, down: m00001.down },
  '00002_scheduler': { up: m00002.up, down: m00002.down },
  '00003_site_canonical': { up: m00003.up, down: m00003.down },
  '00004_rank_votes_rank_range': { up: m00004.up, down: m00004.down },
  '00005_object_categories': { up: m00005.up, down: m00005.down },
  '00006_user_metadata_shop_fields': { up: m00006.up, down: m00006.down },
  '00007_user_object_powers': { up: m00007.up, down: m00007.down },
  '00008_object_updates_rank_score': { up: m00008.up, down: m00008.down },
  '00009_subscription_follow_timestamps': { up: m00009.up, down: m00009.down },
  '00010_currency_tables': { up: m00010.up, down: m00010.down },
  '00011_object_status': { up: m00011.up, down: m00011.down },
  '00012_object_authority_created_at': { up: m00012.up, down: m00012.down },
  '00013_discover_indexes': { up: m00013.up, down: m00013.down },
  '00014_object_tag_categories': { up: m00014.up, down: m00014.down },
  '00015_object_tag_category_items_object_type': {
    up: m00015.up,
    down: m00015.down,
  },
  '00016_waiv_power_history': { up: m00016.up, down: m00016.down },
  '00017_objects_core_created_at': { up: m00017.up, down: m00017.down },
  '00018_knowledge_tables': { up: m00018.up, down: m00018.down },
  '00019_knowledge_files_description': { up: m00019.up, down: m00019.down },
  '00020_knowledge_search_hybrid': { up: m00020.up, down: m00020.down },
  '00021_posts_rewards_finalized_at': { up: m00021.up, down: m00021.down },
  '00022_post_object_related_images': { up: m00022.up, down: m00022.down },
  '00023_user_metadata_hide_favorite_objects': { up: m00023.up, down: m00023.down },
  '00024_post_objects_author_index': { up: m00024.up, down: m00024.down },
  '00025_user_delegations': { up: m00025.up, down: m00025.down },
  '00026_wallet_exemptions': { up: m00026.up, down: m00026.down },
  '00027_hive_engine_swaps': { up: m00027.up, down: m00027.down },
  '00028_hive_engine_swaps_drop_pool_id': { up: m00028.up, down: m00028.down },
  '00029_hive_engine_waiv_airdrops': { up: m00029.up, down: m00029.down },
  '00030_hive_engine_swaps_ref_hive_block_nullable': {
    up: m00030.up,
    down: m00030.down,
  },
  '00031_waiv_generated_reports': { up: m00031.up, down: m00031.down },
  '00032_waiv_generated_reports_merge_fold': { up: m00032.up, down: m00032.down },
  '00033_object_updates_name_trgm': { up: m00033.up, down: m00033.down },
  '00034_user_object_expertise': { up: m00034.up, down: m00034.down },
  '00035_hive_engine_swap_pool_usd': { up: m00035.up, down: m00035.down },
  '00036_objects_core_meta_group_id_index': { up: m00036.up, down: m00036.down },
  '00037_obl': { up: m00037.up, down: m00037.down },
  '00038_obl_contract_metadata': { up: m00038.up, down: m00038.down },
  '00039_obl_payments_contract_and_created_at': { up: m00039.up, down: m00039.down },
  '00040_obl_payments_declared_amount': { up: m00040.up, down: m00040.down },
  '00041_obl_list_indexes': { up: m00041.up, down: m00041.down },
  '00042_obl_arbitration_indexes': { up: m00042.up, down: m00042.down },
  '00043_object_status_closed_privacy_erasure': {
    up: m00043.up,
    down: m00043.down,
  },
  '00044_obl_obligation_lines': { up: m00044.up, down: m00044.down },
  '00045_obl_service_orders_reports': { up: m00045.up, down: m00045.down },
  '00046_obl_contract_service_order_schema': { up: m00046.up, down: m00046.down },
  '00047_hive_engine_deposit_records': { up: m00047.up, down: m00047.down },
  '00048_telegram_subscriptions': { up: m00048.up, down: m00048.down },
  '00049_ops_telegram_subscribers': { up: m00049.up, down: m00049.down },
  '00050_user_notification_settings_columns': { up: m00050.up, down: m00050.down },
  '00051_posts_root_created_unix_index': { up: m00051.up, down: m00051.down },
  '00052_osl_channels_messages': { up: m00052.up, down: m00052.down },
  '00053_channel_members_last_read': { up: m00053.up, down: m00053.down },
  '00054_channels_dissolved_at': { up: m00054.up, down: m00054.down },
  '00055_osl_messages_encryption': { up: m00055.up, down: m00055.down },
  '00056_user_notification_settings_messages': { up: m00056.up, down: m00056.down },
  '00057_object_favorite_ownership': { up: m00057.up, down: m00057.down },
  '00058_profile_feed_read_and_replies': { up: m00058.up, down: m00058.down },
  '00059_object_updates_search_json_prefix': { up: m00059.up, down: m00059.down },
  '00060_messages_original_created_at': { up: m00060.up, down: m00060.down },
  '00061_messages_linked_object_ids': { up: m00061.up, down: m00061.down },
  '00062_user_account_auths': { up: m00062.up, down: m00062.down },
  '00063_user_notification_settings_obl': { up: m00063.up, down: m00063.down },
};
