
export interface SupposedUpdate {
    update_type: string;
    values: string[] | unknown[];  // unknown[] for JSON-valued updates          
    }
  
 export interface ObjectTypeDefinition {
    object_type: string;                  // unique type identifier, e.g. "product", "recipe"
    supported_updates: string[];    // update type names accepted for this object type
    supposed_updates: SupposedUpdate[];  // suggested/autocomplete metadata for tooling
  }

  export type ObjectTypeRegistry = Record<string, ObjectTypeDefinition>;