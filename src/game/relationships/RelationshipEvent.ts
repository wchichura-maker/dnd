export type RelationshipEventType =
  | "FRIENDSHIP_CHANGED"
  | "TRUST_CHANGED"
  | "RESPECT_CHANGED"
  | "FEAR_CHANGED"
  | "ATTRACTION_CHANGED"
  | "LOYALTY_CHANGED"
  | "ALLIANCE_STARTED"
  | "ALLIANCE_ENDED"
  | "RIVALRY_STARTED"
  | "RIVALRY_ENDED"
  | "HOSTILITY_STARTED"
  | "HOSTILITY_ENDED"
  | "ROMANCE_STARTED"
  | "ROMANCE_ENDED"
  | "BETRAYAL"
  | "OTHER";

export type RelationshipEvent = {
  id: string;

  type: RelationshipEventType;

  entityAId: string;

  entityBId: string;

  description: string;

  timestamp: number;
};