import type { Relationship } from "./Relationship";

export function getRelationship(
  relationships: Relationship[],
  entityAId: string,
  entityBId: string
): Relationship | undefined {
  return relationships.find(
    (relationship) =>
      (
        relationship.entityAId ===
          entityAId &&
        relationship.entityBId ===
          entityBId
      ) ||
      (
        relationship.entityAId ===
          entityBId &&
        relationship.entityBId ===
          entityAId
      )
  );
}

export function isHostile(
  relationships: Relationship[],
  entityAId: string,
  entityBId: string
): boolean {
  const relationship =
    getRelationship(
      relationships,
      entityAId,
      entityBId
    );

  return relationship?.hostile === true;
}

export function isAllied(
  relationships: Relationship[],
  entityAId: string,
  entityBId: string
): boolean {
  const relationship =
    getRelationship(
      relationships,
      entityAId,
      entityBId
    );

  return relationship?.allied === true;
}