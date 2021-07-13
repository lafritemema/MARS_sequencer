
import * as SEGMENT from '../../cip/segment';

describe('Test segment interface', ()=> {
  test('parse logical 16 bit buffer', ()=>{
    const expectObj = {
      _stype: 'LOGICAL',
      _type: 'CLASS_ID',
      _format: '8_BIT',
      _value: 108};

    const buff16 = Buffer.from([0x20, 0x6c]);

    const metaBuffer = buff16.slice(0, 1);
    const segment = SEGMENT.parseMeta(metaBuffer);
    const dataBuffer = buff16.slice(1, segment.dataSize + 1);
    segment.parseData(dataBuffer);

    const {...seg} = segment;
    expect(seg).toStrictEqual(expectObj);
  });
  test('parse logical 32 bit buffer', ()=>{
    const expectObj = {
      _stype: 'LOGICAL',
      _type: 'ATTRIBUTE_ID',
      _format: '16_BIT',
      _value: 37158};

    const buff32 = Buffer.from([0x31, 0x26, 0x91]);

    const metaBuffer = buff32.slice(0, 1);
    const segment = SEGMENT.parseMeta(metaBuffer);
    const dataBuffer = buff32.slice(1, segment.dataSize + 1);
    segment.parseData(dataBuffer);

    const {...seg} = segment;
    expect(seg).toStrictEqual(expectObj);
  });
  test('parse logical 40 bit buffer', ()=>{
    const expectObj = {
      _stype: 'LOGICAL',
      _type: 'CONNECTION_POINT',
      _format: '32_BIT',
      _value: 639996198};

    const buff40 = Buffer.from([0x2E, 0x26, 0x91, 0x25, 0x26]);

    const metaBuffer = buff40.slice(0, 1);
    const segment = SEGMENT.parseMeta(metaBuffer);

    const dataBuffer = buff40.slice(1, segment.dataSize + 1);
    segment.parseData(dataBuffer);

    const {...seg} = segment;
    expect(seg).toStrictEqual(expectObj);
  });
});
