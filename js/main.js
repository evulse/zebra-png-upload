var print_data = "";
var file_size = "";
var raw_data = "";

function findPrinters() {
    var applet = document.jzebra;
    if (applet != null) {
        // Searches for locally installed printer with "zebra" in the name
        applet.findPrinter("\\{dummy printer name for listing\\}");
    }

    monitorFinding2();
}

function monitorFinding2() {
    var applet = document.jzebra;
    if (applet != null) {
        if (!applet.isDoneFinding()) {
            window.setTimeout('monitorFinding2()', 100);
        } else {
            var printersCSV = applet.getPrinters();
            var printers = printersCSV.split(",");
            var printboxes = $('.printer-list');

            printboxes.find('option')
                .remove();
            for (p in printers) {
                printboxes.append(
                    $('<option></option>').html(printers[p])
                );
            }

        }
    } else {
        alert("Applet not loaded!");
    }
}

oFReader = new FileReader();

function printZPLImage() {
    var applet = document.jzebra;
    if (applet != null) {
        applet.findPrinter($('#PrinterList').val());
        // Sample text
        applet.append(raw_data);
        // Send characters/raw commands to printer
        applet.print();
    }
}


function loadImageFile() {
    var base;
    $('.send-to-printer').unbind("click");
    $('.send-to-printer').addClass('disabled');
    if (document.getElementById("PNGImage").files.length === 0) { return; }
    var oFile = document.getElementById("PNGImage").files[0];
    oFReader.onload = function(e) {
        var data = e.target.result.split(',');

        print_data = ':B64:'+data[1]+':'+compute(data[1]);
        file_size = oFile.size;
        $('.send-to-printer').removeClass('disabled');

        $(".send-to-printer").click(function() {
            raw_data = '~DYE:'+$('#FileName').val()+',P,P,'+file_size+',,'+print_data+'\n'+'^XA\n^ILE:'+$('#FileName').val()+'.PNG\n^XZ';
            printZPLImage();
        });


    }
    oFReader.readAsDataURL(oFile);
}

function compute(data)
{
    // computes crc value
    var i,j,k;
    var bit;
    var datalen;
    var len;
    var actchar;
    var flag;
    var counter;
    var c;
    var crc = new Array (8+1);
    var mask = new Array (8);
    var hexnum = new Array ("0","1","2","3","4","5","6","7","8","9","A","B","C","D","E","F");
    var order;
    var polynom = new Array (8);
    var init = new Array (8);
    var xor = new Array (8);
    var result;

    order=16;

    // convert crc polynom
    polynom = convertentry ("1021", order);

    // generate bit mask
    counter = order;
    for (i=7; i>=0; i--)
    {
        if (counter>=8) mask[i] = 255;
        else mask[i]=(1<<counter)-1;
        counter-=8;
        if (counter<0) counter=0;
    }

    crc = init;

    crc[8] = 0;

    for (i=0; i<order; i++)
    {
        bit = crc[7-((order-1)>>3)] & (1<<((order-1)&7));
        for (k=0; k<8; k++)
        {
            crc[k] = ((crc [k] << 1) | (crc [k+1] >> 7)) & mask [k];
            if (bit) crc[k]^= polynom[k];
        }
    }
    datalen = data.length;
    len=0;                     // number of data bytes

    crc[8]=0;

    // main loop, algorithm is fast bit by bit type
    for (i=0; i<datalen; i++)
    {
        c = data.charCodeAt(i);

            if (data.charAt(i)=='%')				// unescape byte by byte (%00 allowed)
            {
                if (i>datalen-3)
                {
                    result = "Invalid data sequence";
                    return;
                }
                ch = parseInt(data.charAt(++i), 16);
                if (isNaN(ch) == true)
                {
                    result = "Invalid data sequence";
                    return;
                }
                c = parseInt(data.charAt(++i), 16);
                if (isNaN(c) == true)
                {
                    result = "Invalid data sequence";
                    return;
                }
                c = (c&15) | ((ch&15)<<4);
            }


        // rotate one data byte including crcmask
        for (j=0; j<8; j++)
        {
            bit=0;
            if (crc[7-((order-1)>>3)] & (1<<((order-1)&7))) bit=1;
            if (c&0x80) bit^=1;
            c<<=1;
            for (k=0; k<8; k++)		// rotate all (max.8) crc bytes
            {
                crc[k] = ((crc [k] << 1) | (crc [k+1] >> 7)) & mask [k];
                if (bit) crc[k]^= polynom[k];
            }
        }
        len++;
    }

    // perform xor value
    for (i=0; i<8; i++) crc [i] ^= xor [i];

    // write result
    result = "";

    flag=0;
    for (i=0; i<8; i++)
    {
        actchar = crc[i]>>4;
        if (flag || actchar)
        {
            result += hexnum[actchar];
            flag=1;
        }

        actchar = crc[i] & 15;
        if (flag || actchar || i==7)
        {
            result += hexnum[actchar];
            flag=1;
        }
    }

    return result;

}

function convertentry (input, order)
{
    // convert from ascii to hexadecimal value (stored as byte sequence)
    var len;
    var actchar;
    var polynom = new Array (0,0,0,0,0,0,0,0);
    var brk = new Array (-1,0,0,0,0,0,0,0);

    // convert crc value into byte sequence
    len = input.length;
    for (i=0; i < len; i++)
    {
        actchar = parseInt(input.charAt(i), 16);
        if (isNaN(actchar) == true) return (brk);
        actchar&=15;

        for (j=0; j<7; j++) polynom[j] = ((polynom [j] << 4) | (polynom [j+1] >> 4)) & 255;
        polynom[7] = ((polynom[7] <<4) | actchar) & 255;
    }

    // compute and check crc order
    count = 64;
    for (i=0; i<8; i++)
    {
        for (j=0x80; j; j>>=1)
        {
            if (polynom[i] & j) break;
            count--;
        }
        if (polynom[i] & j) break;
    }
    if (count > order) return (brk);
    return(polynom);
}
