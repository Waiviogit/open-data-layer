

interface RankDocument {
  updateId: string;
  rankId: string;
  rank: number;
  rankTimestamp: string;
  voter: string;
}

interface VoteDocument {
  voteId: string;
  voter: string;
  voteType: 'up' | 'down';
  map?: { type: 'Point', coordinates: [number, number] }; //if updateType is 'map'
  voteTimestamp: string;
}


interface UpdateDocument {
  updateId: string;
  updateType: 'name' | 'map' | 'tag' | 'authority';
  value: string; // can be string or stringified JSON
  rejectedBy: string[]; // list of accounts that rejected the update
  votes: VoteDocument[];
  ranks?: RankDocument[]; //ranks for multiple updates
}



interface ObjectDocument {
  objectId: string;
  objectType: string;
  creator: string;
  updates: UpdateDocument[];
  weight: number; //weight based on earnings on post with this object
  metaGroupId?: string; // key for grouping objects into meta groups
}