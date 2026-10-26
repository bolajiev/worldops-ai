import type { RoadRuntime, ScenePlan, WorldObject } from "./types";
import { terrainElevation } from "./terrain";

export const CELL_SIZE = 2;

export type NavCell = {
  index: number;
  col: number;
  row: number;
  x: number;
  z: number;
  walkable: boolean;
  flooded: boolean;
  permanentWater: boolean;
  bridge: boolean;
  bridgeClearance: number | null;
  building: boolean;
  protected: boolean;
  cost: number;
  roadIds: string[];
  elevation: number;
};

export type NavGrid = {
  cellSize: number;
  cols: number;
  rows: number;
  originX: number;
  originZ: number;
  cells: NavCell[];
  roadCells: Record<string, number[]>;
  bridgeIds: Set<string>;
  floodCells: Array<[number, number]>;
};

export type GridRoadState = Pick<RoadRuntime, "blockedBy" | "protectedTicks">;

function getScale(object: WorldObject): [number, number, number] {
  return object.scale ?? [2, 1, 2];
}

function inFootprint(
  x: number,
  z: number,
  object: WorldObject,
  margin = 0,
): boolean {
  const scale = getScale(object);
  const theta = object.rotation?.[1] ?? 0;
  const dx = x - object.position[0];
  const dz = z - object.position[2];
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const localX = cos * dx - sin * dz;
  const localZ = sin * dx + cos * dz;
  return (
    Math.abs(localX) <= scale[0] / 2 + margin &&
    Math.abs(localZ) <= scale[2] / 2 + margin
  );
}

function bridgeClearance(object: WorldObject): number {
  const raw = object.metadata?.clearance;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0.55;
}

export function buildNavigationGrid(
  plan: ScenePlan,
  waterLevel: number,
  roadStates: Record<string, GridRoadState> = {},
): NavGrid {
  const { width, depth } = plan.worldBounds;
  const cols = Math.max(10, Math.round(width / CELL_SIZE));
  const rows = Math.max(10, Math.round(depth / CELL_SIZE));
  const cellSize = width / cols;
  const originX = -width / 2;
  const originZ = -depth / 2;

  const roads = plan.objects.filter(
    (object) => object.type === "road" || object.type === "bridge",
  );
  const bridges = plan.objects.filter((object) => object.type === "bridge");
  const waterObjects = plan.objects.filter((object) => object.type === "water");
  const buildings = plan.objects.filter((object) =>
    ["house", "school", "clinic", "shelter", "factory"].includes(object.type),
  );

  const cells: NavCell[] = [];
  const roadCells: Record<string, number[]> = {};
  const bridgeIds = new Set<string>();

  for (const road of roads) {
    roadCells[road.id] = [];
    if (road.type === "bridge") bridgeIds.add(road.id);
  }

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const x = originX + cellSize * (col + 0.5);
      const z = originZ + cellSize * (row + 0.5);
      const index = row * cols + col;

      const coveredRoads = roads.filter((object) => inFootprint(x, z, object, 0.3));
      const coveredBridges = bridges.filter((object) => inFootprint(x, z, object, 0.3));
      const inWater = waterObjects.some((object) => inFootprint(x, z, object, 0.1));
      const inBuilding = buildings.some((object) => inFootprint(x, z, object, 0.55));
      const elevation = terrainElevation(plan, x, z);

      const isBridge = coveredBridges.length > 0;
      const clearance = isBridge
        ? Math.max(...coveredBridges.map((bridge) => bridgeClearance(bridge)))
        : null;

      const protectedCell = coveredRoads.some(
        (object) => (roadStates[object.id]?.protectedTicks ?? 0) > 0,
      );
      const blockedCell = coveredRoads.some(
        (object) => roadStates[object.id]?.blockedBy != null,
      );

      let flooded: boolean;
      if (isBridge && clearance !== null) {
        flooded = waterLevel >= clearance;
      } else {
        flooded = elevation <= waterLevel;
      }
      if (inWater && !isBridge) flooded = true;
      if (protectedCell) flooded = false;

      const permanentWater = inWater && !isBridge;
      const walkable = !permanentWater && !inBuilding && !flooded && !blockedCell;

      const cell: NavCell = {
        index,
        col,
        row,
        x,
        z,
        walkable,
        flooded,
        permanentWater,
        bridge: isBridge,
        bridgeClearance: clearance,
        building: inBuilding,
        protected: protectedCell,
        cost: coveredRoads.length > 0 ? 1 : 2.2,
        roadIds: coveredRoads.map((object) => object.id),
        elevation: isBridge && clearance !== null ? Math.max(elevation, clearance) : elevation,
      };
      cells.push(cell);

      for (const road of coveredRoads) {
        roadCells[road.id].push(index);
      }
    }
  }

  const floodCells: Array<[number, number]> = cells
    .filter((cell) => cell.flooded && !cell.permanentWater)
    .map((cell) => [cell.x, cell.z]);

  return {
    cellSize,
    cols,
    rows,
    originX,
    originZ,
    cells,
    roadCells,
    bridgeIds,
    floodCells,
  };
}

export function cellAt(grid: NavGrid, x: number, z: number): NavCell | null {
  const col = Math.floor((x - grid.originX) / grid.cellSize);
  const row = Math.floor((z - grid.originZ) / grid.cellSize);
  if (col < 0 || col >= grid.cols || row < 0 || row >= grid.rows) return null;
  return grid.cells[row * grid.cols + col];
}

export function nearestWalkableCell(
  grid: NavGrid,
  x: number,
  z: number,
  maxRadius = 8,
): NavCell | null {
  const start = cellAt(grid, x, z);
  if (!start) return null;
  if (start.walkable) return start;

  let best: NavCell | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let radius = 1; radius <= maxRadius; radius += 1) {
    for (let dRow = -radius; dRow <= radius; dRow += 1) {
      for (let dCol = -radius; dCol <= radius; dCol += 1) {
        if (Math.max(Math.abs(dRow), Math.abs(dCol)) !== radius) continue;
        const col = start.col + dCol;
        const row = start.row + dRow;
        if (col < 0 || col >= grid.cols || row < 0 || row >= grid.rows) continue;
        const cell = grid.cells[row * grid.cols + col];
        if (!cell.walkable) continue;
        const distance = Math.hypot(cell.x - x, cell.z - z);
        if (distance < bestDistance) {
          best = cell;
          bestDistance = distance;
        }
      }
    }
    if (best) return best;
  }
  return best;
}

export function shelterGoalCell(
  grid: NavGrid,
  shelter: WorldObject,
): NavCell | null {
  return nearestWalkableCell(grid, shelter.position[0], shelter.position[2], 7);
}

type HeapNode = { index: number; score: number };

class MinHeap {
  private nodes: HeapNode[] = [];

  push(node: HeapNode): void {
    this.nodes.push(node);
    let child = this.nodes.length - 1;
    while (child > 0) {
      const parent = Math.floor((child - 1) / 2);
      if (this.nodes[parent].score <= this.nodes[child].score) break;
      [this.nodes[parent], this.nodes[child]] = [this.nodes[child], this.nodes[parent]];
      child = parent;
    }
  }

  pop(): HeapNode | undefined {
    if (this.nodes.length === 0) return undefined;
    const top = this.nodes[0];
    const last = this.nodes.pop();
    if (this.nodes.length > 0 && last) {
      this.nodes[0] = last;
      let parent = 0;
      for (;;) {
        const left = parent * 2 + 1;
        const right = left + 1;
        let smallest = parent;
        if (
          left < this.nodes.length &&
          this.nodes[left].score < this.nodes[smallest].score
        ) {
          smallest = left;
        }
        if (
          right < this.nodes.length &&
          this.nodes[right].score < this.nodes[smallest].score
        ) {
          smallest = right;
        }
        if (smallest === parent) break;
        [this.nodes[parent], this.nodes[smallest]] = [
          this.nodes[smallest],
          this.nodes[parent],
        ];
        parent = smallest;
      }
    }
    return top;
  }

  get size(): number {
    return this.nodes.length;
  }
}

const NEIGHBOR_OFFSETS = [
  [-1, 0, 1],
  [1, 0, 1],
  [0, -1, 1],
  [0, 1, 1],
  [-1, -1, Math.SQRT2],
  [1, -1, Math.SQRT2],
  [-1, 1, Math.SQRT2],
  [1, 1, Math.SQRT2],
] as const;

function heuristic(a: NavCell, b: NavCell): number {
  const dx = Math.abs(a.col - b.col);
  const dz = Math.abs(a.row - b.row);
  return Math.max(dx, dz) + (Math.SQRT2 - 1) * Math.min(dx, dz);
}

export function findPath(
  grid: NavGrid,
  startIndex: number,
  goalIndex: number,
): number[] | null {
  const start = grid.cells[startIndex];
  const goal = grid.cells[goalIndex];
  if (!start || !goal || !start.walkable || !goal.walkable) return null;
  if (startIndex === goalIndex) return [startIndex];

  const total = grid.cells.length;
  const gScore = new Float64Array(total).fill(Number.POSITIVE_INFINITY);
  const cameFrom = new Int32Array(total).fill(-1);
  const closed = new Uint8Array(total);

  gScore[startIndex] = 0;
  const open = new MinHeap();
  open.push({ index: startIndex, score: heuristic(start, goal) });

  let expanded = 0;
  while (open.size > 0 && expanded < 9000) {
    const current = open.pop();
    if (!current) break;
    const currentIndex = current.index;
    if (closed[currentIndex]) continue;
    if (currentIndex === goalIndex) {
      const path: number[] = [];
      let cursor = goalIndex;
      while (cursor !== -1) {
        path.push(cursor);
        cursor = cameFrom[cursor];
      }
      path.reverse();
      return path;
    }
    closed[currentIndex] = 1;
    expanded += 1;

    const cell = grid.cells[currentIndex];
    for (const [dCol, dRow, step] of NEIGHBOR_OFFSETS) {
      const col = cell.col + dCol;
      const row = cell.row + dRow;
      if (col < 0 || col >= grid.cols || row < 0 || row >= grid.rows) continue;
      const neighborIndex = row * grid.cols + col;
      const neighbor = grid.cells[neighborIndex];
      if (!neighbor.walkable) continue;
      if (dCol !== 0 && dRow !== 0) {
        const sideA = grid.cells[cell.row * grid.cols + col];
        const sideB = grid.cells[row * grid.cols + cell.col];
        if (!sideA?.walkable || !sideB?.walkable) continue;
      }
      const tentative = gScore[currentIndex] + step * neighbor.cost;
      if (tentative >= gScore[neighborIndex]) continue;
      gScore[neighborIndex] = tentative;
      cameFrom[neighborIndex] = currentIndex;
      open.push({
        index: neighborIndex,
        score: tentative + heuristic(neighbor, goal),
      });
    }
  }

  return null;
}

export function pathPoints(
  grid: NavGrid,
  path: number[],
): Array<[number, number]> {
  return path.map((index) => [grid.cells[index].x, grid.cells[index].z]);
}

export function distanceToShelter(
  position: [number, number],
  shelter: WorldObject,
): number {
  return Math.hypot(
    position[0] - shelter.position[0],
    position[1] - shelter.position[2],
  );
}
