
const countBits = (count:number) => {
  let n = count;
  n = n - ((n >> 1) & 0x55555555);
  n = (n & 0x33333333) + ((n >> 2) & 0x33333333);
  return ((n + (n >> 4) & 0xF0F0F0F) * 0x1010101) >> 24;
};

/**
 * @interface ShortLongObj
 */
interface ShortLongObj{
  short:Uint8Array,
  long:Uint8Array
};

/**
 * @class BitVector
 */
export class BitVector {
  private _array:Uint8Array;
  private _bitsPerElement:number;

  /**
   * BitVector constructor.
   *
   * @constructor
   * @param {number} size -> Size of the bitvector in bits.
   */
  constructor(size:number) {
    this._array = new Uint8Array(Math.ceil(size / 8));
    this._bitsPerElement = (this._array.BYTES_PER_ELEMENT * 8);
  }

  /**
   * Get the vector size in bit
   * @return {number} vector size in bit
   */
  get bits() : number {
    return this._bitsPerElement * this._array.length;
  }

  /**
   * Get BitvVector lenght
   * @return {number} bitvector lenght
   */
  get length() :number {
    return this._array.length;
  }

  /**
   * Get array representing bitvector
   * @return {Uint8Array} bitvector array
   */
  get bitVector() : Uint8Array {
    return this._array;
  }

  /**
   * Set the bitvector array
   * @param {Uint8Array} bitArray -> new array
   */
  set bitVector(bitArray:Uint8Array) {
    this._array = bitArray;
  }

  /**
   * Clears the bit at the given index.
   *
   * @param {number} index -> number for index: 0 <= index < bitVec.bits.
   * @throws {RangeError} Throws range error if index is out of range.
   */
  rangeCheck(index:number) : void {
    if (!(index < this.bits) || index < 0) {
      // eslint-disable-next-line max-len
      throw new RangeError(`Given index ${index} out of range of bit vector length ${this.bits}`);
    }
  }

  /**
   * Get the value of one bit - 1 or 0
   * @param {number} index -> index number
   * @return {number} bit value (1 or 0)
   */
  get(index:number) : number {
    this.rangeCheck(index);
    const byteIndex = Math.floor(index / this._bitsPerElement);
    const bitIndex = index % this._bitsPerElement;

    return (this._array[byteIndex] & (1 << bitIndex)) > 0 ? 1 : 0;
  }

  /**
   * Set the value of one bit in the bitvector
   * @param {number} index -> index number
   * @param {number} value -> value 1 or 0 - default 1
   * @return {this} `BitVector` instance for chaining.
   */
  set(index:number, value:number = 1) : BitVector {
    this.rangeCheck(index);
    const byteIndex = Math.floor(index / this._bitsPerElement);
    const bitIndex = index % this._bitsPerElement;

    if (value) {
      this._array[byteIndex] |= (1 << bitIndex);
    } else {
      this._array[byteIndex] &= ~(1 << bitIndex);
    }

    return this;
  }

  /**
   * Clear the value of one bit in the bitvector
   * @param {number} index -> index number
   * @return {this} `BitVector` instance for chaining.
   */
  clear(index:number) : BitVector {
    return this.set(index, 0);
  }

  /**
   * Flips the value of one bit in the bitvector.
   * @param {number} index -> index number
   * @return {this} `BitVector` instance for chaining.
   */
  flip(index:number) : BitVector {
    this.rangeCheck(index);
    const byteIndex = Math.floor(index / this._bitsPerElement);
    const bitIndex = index % this._bitsPerElement;
    this._array[byteIndex] ^= (1 << bitIndex);
    return this;
  }

  /**
   * Test the value of one bit in the bitvector.
   * @param {number} index -> index number
   * @return {Boolean} true if bit == 1 false otherwise
   */
  test(index:number) : boolean {
    return this.get(index) === 1;
  }

  /**
   * Count the number of bit equal to 1 in the bitvector
   * @return {number} number of indices currently set to 1.
   */
  count() : number {
    let c = 0;
    for (let i = 0; i < this._array.length; i += 1) {
      c += countBits(this._array[i]);
    }
    return c;
  }

  /**
   * Sets a range of bits from begin to end in the bitvector
   * @param {number} begin -> index number where begin
   * @param {number} end -> index number where finish (inclusive)
   * @param {number} value -> value to set the index to (0 or 1).
   * @return {this} `BitVector` instance for chaining.
   */
  setRange(begin:number, end:number, value:number = 1) : BitVector {
    for (let i = begin; i < end; i += 1) {
      this.set(i, value);
    }
    return this;
  }

  /**
   * Clears a range of bits from begin to end in the bitvector
   * @param {number} begin -> index number where begin
   * @param {number} end -> index number where finish (inclusive)
   * @return {this} `BitVector` instance for chaining.
   */
  clearRange(begin:number, end:number) :BitVector {
    this.setRange(begin, end, 0);
    return this;
  }

  /**
   * Compare the bitvector size with an other BitVector instance in parameter
   * It returns an object {short, long}
   * This object containing the Uint8Array describing the both bitvectors.
   *
   * @param {BitVector} bitVec -> instance of BitVector class.
   * @return {ShortLongObj} Returns object with two keys of type `UIntArray`,
   *                  short = shorter bit vector, long = longer bit vector.
   */
  shortLong(bitVec:BitVector) : ShortLongObj {
    let short;
    let long;

    if (bitVec.length < this.length) {
      short = bitVec._array;
      long = this._array;
    } else {
      short = this._array;
      long = bitVec._array;
    }

    return {short, long};
  }

  /**
   * Bitwise or operation between the bitvector and an other BitVector instance
   * returns the result as a new BitVector instance.
   * @param {BitVector} bitVec -> instance of BitVector class.
   * @return {BitVector} new BitVector object with the result of the operation.
   */
  or(bitVec:BitVector) : BitVector {
    // eslint-disable-next-line max-len
    // Get short and long _arrays, assign correct variables -> for ops between two diff sized _arrays.
    const {short, long} = this.shortLong(bitVec);
    const array = new Uint8Array(long.length);

    // Perform operation over shorter _array.
    for (let i = 0; i < short.length; i += 1) {
      array[i] = short[i] | long[i];
    }

    // Fill in the remaining unchanged numbers from the longer _array.
    for (let j = short.length; j < long.length; j += 1) {
      array[j] = long[j];
    }

    // Return a new BitVector object.
    return BitVector.fromArray(array);
  }

  /**
   * Bitwise xor operation between the bitvector and an other BitVector instance
   * returns the result as a new BitVector instance.
   * @param {BitVector} bitVec -> instance of BitVector class.
   * @return {BitVector} new BitVector object with the result of the operation.
   */
  xor(bitVec:BitVector) : BitVector {
    // eslint-disable-next-line max-len
    // Get short and long _arrays, assign correct variables -> for ops between two diff sized _arrays.
    const {short, long} = this.shortLong(bitVec);
    const array = new Uint8Array(long.length);

    // Perform operation over shorter _array.
    for (let i = 0; i < short.length; i += 1) {
      array[i] = short[i] ^ long[i];
    }

    // Fill in the remaining numbers from the longer _array.
    for (let j = short.length; j < long.length; j += 1) {
      array[j] = 0 ^ long[j];
    }

    // Return a new BitVector object.
    return BitVector.fromArray(array);
  }

  /**
   * Bitwise and operation between the bitvector and an other BitVector instance
   * returns the result as a new BitVector instance.
   * @param {BitVector} bitVec -> instance of BitVector class.
   * @return {BitVector} new BitVector object with the result of the operation.
   */
  and(bitVec:BitVector) : BitVector {
    // eslint-disable-next-line max-len
    // Get short and long _arrays, assign correct variables -> for ops between two diff sized _arrays.
    const {short, long} = this.shortLong(bitVec);
    const array = new Uint8Array(long.length);

    // Perform operation over shorter _array.
    for (let i = 0; i < short.length; i += 1) {
      array[i] = short[i] & long[i];
    }

    // Fill in the remaining unchanged numbers from the longer _array.
    for (let j = short.length; j < long.length; j += 1) {
      array[j] = long[j];
    }

    // Return a new BitVector object.
    return BitVector.fromArray(array);
  }

  /**
   * Check if the bitvector is equal to an other BitVector instance
   *
   * @param {BitVector} bitVec -> instance of BitVector class.
   * @return {Boolean} true if the two bit vectors are equal, false otherwise.
   */
  equals(bitVec:BitVector) :boolean {
    const {short, long} = this.shortLong(bitVec);

    for (let i = 0; i < short.length; i += 1) {
      if (short[i] !== long[i]) {
        return false;
      }
    }

    // If the longer _array is all 0, they are equal, if not then they are not.
    // equiv to padding shorter bit _array to larger _array length & comparing.
    // Allows comparisons along vecs of different length.
    for (let j = short.length; j < long.length; j += 1) {
      if (long[j] !== 0) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if the bitvector is not equal to an other BitVector instance
   *
   * @param {BitVector} bitVec -> instance of BitVector class.
   * @return {Boolean} true if the two bitvectors are not equal false otherwise.
   */
  notEquals(bitVec:BitVector) :boolean {
    return !this.equals(bitVec);
  }

  /**
   * Bitwise not operation on the bitvector
   * returns the result as a new BitVector instance.
   * @return {BitVector} new BitVector object with the result of the operation.
   */
  not() : BitVector {
    const array = new Uint8Array(this._array.length);

    for (let i = 0; i < this._array.length; i += 1) {
      array[i] = ~this._array[i];
    }

    return BitVector.fromArray(array);
  }

  /**
   * Invert all bits in the bitvector
   * Alias for not() except it update the actual instance
   * @return {this} `BitVector` instance for chaining.
   */
  invert() : this {
    this._array = this.not()._array;
    return this;
  }

  /**
   * Bitwise or operation between the bitvector and an other BitVector instance
   * Alias for or() except it update the actual instance
   * @param {BitVector} bitVec -> instance of BitVector class.
   * @return {this} `BitVector` instance for chaining.
   */
  orEqual(bitVec:BitVector) : this {
    this._array = this.or(bitVec)._array;
    return this;
  }

  /**
   * Bitwise xor operation between the bitvector and an other BitVector instance
   * Alias for xor() except it update the actual instance
   * @param {BitVector} bitVec -> instance of BitVector class.
   * @return {this} `BitVector` instance for chaining.
   */
  xorEqual(bitVec:BitVector) : this {
    this._array = this.xor(bitVec)._array;
    return this;
  }

  /**
   * Bitwise and operation between the bitvector and an other BitVector instance
   * Alias for and() except it update the actual instance
   * @param {BitVector} bitVec -> instance of BitVector class.
   * @return {this} `BitVector` instance for chaining.
   */
  andEqual(bitVec:BitVector):this {
    this._array = this.and(bitVec)._array;
    return this;
  }

  /**
   * Bitwise not operation on the bitvector
   * Alias for not() except it update the actual instance
   * @return {this} `BitVector` instance for chaining.
   */
  notEqual() : this {
    this._array = this.not()._array;
    return this;
  }

  /**
   * Check if the bitvector as any set bit
   * @return {Boolean} true if the bit vector has no set bits, false otherwise.
   */
  isEmpty() : boolean {
    for (let i = 0; i < this._array.length; i += 1) {
      if (this._array[i] !== 0) {
        return false;
      }
    }
    return true;
  }
  /**
   * Get the UintArray describing the bitvector
   * @return {Uint8Array} array describin the bitvector
   */
  toArray() : Uint8Array {
    return this._array;
  }
  /**
   * Create a BitVector instance from an Uint8Array
   * @param {Uint8Array} bitVec Uint8Array use as source
   * @return {BitVector} new BitVector instance
   */
  static fromArray(bitVec:Uint8Array) {
    const newBitVec = new BitVector(0);
    newBitVec.bitVector = bitVec;
    return newBitVec;
  }
}


