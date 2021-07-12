
import { ItemType } from "./item_type";

interface DataItem{
    typeId : string,
    dataBuf : Buffer
}

export class CPF{

    public static build(dataItems:DataItem[]) : Buffer
    {
        // define an cpf buffer size 2 bytes
        let cpfBuf = Buffer.alloc(2);

        // write the number of dataitems in the cpf buffer
        cpfBuf.writeUInt16LE(dataItems.length, 0);

        //for each data items 
        for (let item of dataItems) {

            const {typeId, dataBuf} = item;

            // initialise a buffer size 4 bytes to write the typeId and data length
            let itemBuf = Buffer.alloc(4);
            // write typeId in itemBuf in the 2 first bytes

            if(ItemType[<keyof typeof ItemType>typeId] == undefined) throw new Error(`ERROR: The item ID <${typeId}> is not a available item ID`) 
            itemBuf.writeUInt16LE(ItemType[<keyof typeof ItemType>typeId], 0);

            //update the itemBuf with data length
            itemBuf.writeUInt16LE(dataBuf.length, 2);

            //update the cpfBuf with 
            // itemBuf and dataBuf if not empty or only itemBuf else
            
            cpfBuf = dataBuf.length > 0 ? Buffer.concat([cpfBuf, itemBuf, dataBuf]) : Buffer.concat([cpfBuf, itemBuf])
        }

        return cpfBuf;
    }

    public static parse(cpfBuf:Buffer) : DataItem[]
    {
        // intitialize a DataItem table
        let dataItems: DataItem[] = [];

        //read the buffer 2 first bytes to get the number of DataItem
        const itemCount:number = cpfBuf.readUInt16LE(0);

        //definine a pointer to go through the buffer
        // it begin to 2 (dataItem infos first bit)
        let bufPtr = 2;

        // loop to get data from each dataItems in buffer
        for (let i = 0; i < itemCount; i++) {
            
            // Get ItemTypeId
            const typeCode:number = cpfBuf.readUInt16LE(bufPtr);
            
            if(!ItemType[typeCode]) throw new Error(`ERROR: The item code <${typeCode}> is not an available item code.`)
            
            const typeId:string = ItemType[typeCode];
            //incerent pointer 2 time
            bufPtr += 2;

            // Get Data Length
            const dataLength = cpfBuf.readUInt16LE(bufPtr);
            //increment pointer 2 time
            bufPtr += 2;

            // Get Data from Data Buffer
            // Initialize buffer with datalength size 
            const dataBuf = Buffer.alloc(dataLength);

            //copy the cpf buffer in data buffer
            //begin to bit 0 of data buffer, bit from bufPtr to bufPtr+lenght of cpfBuf
            cpfBuf.copy(dataBuf, 0, bufPtr, bufPtr + dataLength);

            // append the dataItem object to 
            dataItems.push({typeId:typeId,  dataBuf:dataBuf});

            bufPtr += dataLength;
        }
        return dataItems;
    }
}

