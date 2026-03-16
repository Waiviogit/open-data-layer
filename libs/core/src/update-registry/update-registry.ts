import { UPDATE_NAME } from "./name";
import { UpdateRegistry } from "./types";
import { UPDATE_TYPES } from "./update-types";

export const UPDATE_REGISTRY = {
    [UPDATE_TYPES.NAME]: UPDATE_NAME,
} satisfies UpdateRegistry;