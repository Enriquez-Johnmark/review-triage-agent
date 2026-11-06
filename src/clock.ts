/** Where all logic reads time, so tests control it (architecture.md). */
export interface Clock {
  now(): Date
}

export const systemClock: Clock = {
  // The one place the system clock is read.
  // eslint-disable-next-line no-restricted-syntax
  now: () => new Date(),
}

/** A clock that only moves when told to. */
export class FixedClock implements Clock {
  #at: Date
  constructor(at: Date) {
    this.#at = at
  }
  now(): Date {
    return new Date(this.#at)
  }
  advanceDays(days: number): void {
    this.#at = new Date(this.#at.getTime() + days * 86_400_000)
  }
}
