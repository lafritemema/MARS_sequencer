
export enum Commands {
    NOP= 0x00,
    ListServices= 0x04,
    ListIdentity= 0x63, // List devices Command
    ListInterfaces= 0x64,
    RegisterSession= 0x65, // Begin Session Command
    UnregisterSession= 0x66, // Close Session Command
    SendRRData= 0x6f, // Send Unconnected Data Command
    SendUnitData= 0x70, // Send Connnected Data Command
    IndicateStatus= 0x72,
    Cancel= 0x73
}
