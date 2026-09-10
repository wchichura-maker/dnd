import type { Position } from "../world/Position";

export type ControllerType =
  | "PLAYER"
  | "AI";

export type Entity = {
  id: string;

  name: string;

  position: Position;

  controller: ControllerType;
};