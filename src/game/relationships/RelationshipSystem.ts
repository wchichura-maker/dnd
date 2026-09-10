import type { Relationship } from "./Relationship";
import type { RelationshipEvent } from "./RelationshipEvent";

export class RelationshipSystem {
  private relationships: Relationship[];

  private events: RelationshipEvent[];

  constructor(
    relationships: Relationship[] = [],
    events: RelationshipEvent[] = []
  ) {
    this.relationships =
      relationships;

    this.events =
      events;
  }

  getRelationships(): Relationship[] {
    return [
      ...this.relationships
    ];
  }

  getEvents(): RelationshipEvent[] {
    return [
      ...this.events
    ];
  }

  getRelationship(
    entityAId: string,
    entityBId: string
  ): Relationship | undefined {
    return this.relationships.find(
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

  createRelationship(
    entityAId: string,
    entityBId: string
  ): Relationship {
    const existing =
      this.getRelationship(
        entityAId,
        entityBId
      );

    if (existing) {
      return existing;
    }

    const relationship: Relationship = {
      id:
        `relationship-${Date.now()}-${Math.random()}`,

      entityAId,

      entityBId,

      friendship: 0,

      trust: 0,

      respect: 0,

      fear: 0,

      attraction: 0,

      loyalty: 0,

      hostile: false,

      allied: false,

      rival: false,

      romantic: false
    };

    this.relationships.push(
      relationship
    );

    return relationship;
  }

  isHostile(
    entityAId: string,
    entityBId: string
  ): boolean {
    const relationship =
      this.getRelationship(
        entityAId,
        entityBId
      );

    if (!relationship) {
      return false;
    }

    return relationship.hostile;
  }

  isAllied(
    entityAId: string,
    entityBId: string
  ): boolean {
    const relationship =
      this.getRelationship(
        entityAId,
        entityBId
      );

    if (!relationship) {
      return false;
    }

    return relationship.allied;
  }

  isRival(
    entityAId: string,
    entityBId: string
  ): boolean {
    const relationship =
      this.getRelationship(
        entityAId,
        entityBId
      );

    if (!relationship) {
      return false;
    }

    return relationship.rival;
  }

  setHostile(
    entityAId: string,
    entityBId: string,
    hostile: boolean,
    description: string
  ): Relationship {
    const relationship =
      this.createRelationship(
        entityAId,
        entityBId
      );

    relationship.hostile =
      hostile;

    if (hostile) {
      relationship.allied =
        false;
    }

    this.addEvent({
      type: hostile
        ? "HOSTILITY_STARTED"
        : "HOSTILITY_ENDED",

      entityAId,

      entityBId,

      description
    });

    return relationship;
  }

  setAllied(
    entityAId: string,
    entityBId: string,
    allied: boolean,
    description: string
  ): Relationship {
    const relationship =
      this.createRelationship(
        entityAId,
        entityBId
      );

    relationship.allied =
      allied;

    if (allied) {
      relationship.hostile =
        false;
    }

    this.addEvent({
      type: allied
        ? "ALLIANCE_STARTED"
        : "ALLIANCE_ENDED",

      entityAId,

      entityBId,

      description
    });

    return relationship;
  }

  setRival(
    entityAId: string,
    entityBId: string,
    rival: boolean,
    description: string
  ): Relationship {
    const relationship =
      this.createRelationship(
        entityAId,
        entityBId
      );

    relationship.rival =
      rival;

    this.addEvent({
      type: rival
        ? "RIVALRY_STARTED"
        : "RIVALRY_ENDED",

      entityAId,

      entityBId,

      description
    });

    return relationship;
  }

  setRomantic(
    entityAId: string,
    entityBId: string,
    romantic: boolean,
    description: string
  ): Relationship {
    const relationship =
      this.createRelationship(
        entityAId,
        entityBId
      );

    relationship.romantic =
      romantic;

    this.addEvent({
      type: romantic
        ? "ROMANCE_STARTED"
        : "ROMANCE_ENDED",

      entityAId,

      entityBId,

      description
    });

    return relationship;
  }

  changeFriendship(
    entityAId: string,
    entityBId: string,
    amount: number,
    description: string
  ): Relationship {
    const relationship =
      this.createRelationship(
        entityAId,
        entityBId
      );

    relationship.friendship =
      this.clamp(
        relationship.friendship +
          amount
      );

    this.addEvent({
      type:
        "FRIENDSHIP_CHANGED",

      entityAId,

      entityBId,

      description
    });

    return relationship;
  }

  changeTrust(
    entityAId: string,
    entityBId: string,
    amount: number,
    description: string
  ): Relationship {
    const relationship =
      this.createRelationship(
        entityAId,
        entityBId
      );

    relationship.trust =
      this.clamp(
        relationship.trust +
          amount
      );

    this.addEvent({
      type:
        "TRUST_CHANGED",

      entityAId,

      entityBId,

      description
    });

    return relationship;
  }

  changeRespect(
    entityAId: string,
    entityBId: string,
    amount: number,
    description: string
  ): Relationship {
    const relationship =
      this.createRelationship(
        entityAId,
        entityBId
      );

    relationship.respect =
      this.clamp(
        relationship.respect +
          amount
      );

    this.addEvent({
      type:
        "RESPECT_CHANGED",

      entityAId,

      entityBId,

      description
    });

    return relationship;
  }

  changeFear(
    entityAId: string,
    entityBId: string,
    amount: number,
    description: string
  ): Relationship {
    const relationship =
      this.createRelationship(
        entityAId,
        entityBId
      );

    relationship.fear =
      this.clamp(
        relationship.fear +
          amount
      );

    this.addEvent({
      type:
        "FEAR_CHANGED",

      entityAId,

      entityBId,

      description
    });

    return relationship;
  }

  changeAttraction(
    entityAId: string,
    entityBId: string,
    amount: number,
    description: string
  ): Relationship {
    const relationship =
      this.createRelationship(
        entityAId,
        entityBId
      );

    relationship.attraction =
      this.clamp(
        relationship.attraction +
          amount
      );

    this.addEvent({
      type:
        "ATTRACTION_CHANGED",

      entityAId,

      entityBId,

      description
    });

    return relationship;
  }

  changeLoyalty(
    entityAId: string,
    entityBId: string,
    amount: number,
    description: string
  ): Relationship {
    const relationship =
      this.createRelationship(
        entityAId,
        entityBId
      );

    relationship.loyalty =
      this.clamp(
        relationship.loyalty +
          amount
      );

    this.addEvent({
      type:
        "LOYALTY_CHANGED",

      entityAId,

      entityBId,

      description
    });

    return relationship;
  }

  betray(
    entityAId: string,
    entityBId: string,
    description: string
  ): Relationship {
    const relationship =
      this.createRelationship(
        entityAId,
        entityBId
      );

    relationship.allied =
      false;

    relationship.hostile =
      true;

    relationship.trust =
      this.clamp(
        relationship.trust -
          50
      );

    relationship.loyalty =
      this.clamp(
        relationship.loyalty -
          50
      );

    this.addEvent({
      type:
        "BETRAYAL",

      entityAId,

      entityBId,

      description
    });

    return relationship;
  }

  private addEvent(
    data: Omit<
      RelationshipEvent,
      "id" | "timestamp"
    >
  ): void {
    this.events.push({
      id:
        `relationship-event-${Date.now()}-${Math.random()}`,

      timestamp:
        Date.now(),

      ...data
    });
  }

  private clamp(
    value: number
  ): number {
    return Math.max(
      -100,
      Math.min(
        100,
        value
      )
    );
  }
}