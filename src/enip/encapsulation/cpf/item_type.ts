
export enum ItemType{
    Null=0x00,
    ListIdentity=0x0c,
    ConnectionBased=0xa1,
    ConnectedTransportPacket=0xb1,
    UCMM=0xb2, //unconnected messsage manager
    ListServices=0x100,
    SockaddrO2T=0x8000,
    SockaddrT2O=0x8001,
    SequencedAddrItem=0x8002
}