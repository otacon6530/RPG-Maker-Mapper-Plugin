/**Define Objects**/
function Mapper_DataManager() {
    this.initialize(...arguments);
}

Mapper_DataManager.prototype.initialize = function () {
    this.dataSets = new Array();
    this._errors = new Array();
    this._loading = 0;
    this._loaded = 0;
    this.worldSets = new Array();
    this.loadMaps();
};

/**load all maps**/
Mapper_DataManager.prototype.loadMaps = function () {
    this._loading = $dataMapInfos.length;
    $dataMapInfos.forEach(map => {
        if (map !== null) {
            const id = parseInt(map.id).toString();
            const filename = "Map%1.json".format(id.padZero(3));
            const name = map.name;
            this.loadDataFile(name, filename, id);
        } else {
            this._loading--;
        }
    });
    this.waitForMaps();
};

Mapper_DataManager.prototype.build = function () {
    //Loop through all worlds
    Object.values(this.worldSets).forEach(world => {
        //Loop through all maps
        tempCount = 0;
        for (let i = world.xMin; i <= world.xMax; i++) {
            for (let j = world.yMin; j <= world.yMax; j++) {
                map = world.mapSets[i][j];
                if (map !== undefined) { }
                this.createSector(map, world);
            }
        }

    });
};

Mapper_DataManager.prototype.createSector = function (map, world) {
    if (map !== undefined) {
        if (map._worldX == 0 && map._worldY == 0) {
            xMin = parseInt(map._worldX) - 1;
            yMin = parseInt(map._worldY) - 1;
            xMax = parseInt(map._worldX) + 1;
            yMax = parseInt(map._worldY) + 1;
            SWidth = yMax - yMin;
            w = map.width;
            h = map.height;
            fill = new Array(w * 3 * h * 3 * 6).fill(0);//fill for blank sectors
            let i = 0;
            for (let y = yMax; y >= yMin; y--) {//loop top to bottom sectors
                for (let x = xMin; x <= xMax; x++) {//loop left to right sectors
                    for (let k = 0; k <= w * h; k++) {
                        if (x in world.mapSets) {
                            if (y in world.mapSets[x]) {
                                round = Math.floor(k / w);
                                fillPos = k + w * (x + 1) + (round * 2 * (yMax - yMin + 1)) + ((yMax - y) * w * h * (yMax - yMin + 1))
                                fill[fillPos] = world.mapSets[x][y].data[k];
                            }
                        }
                    }
                }
            }
            map.data = fill;
            map.width = map.width * 3;
            map.height = map.height * 3;
            const fs = require("fs");
            const id = parseInt(map.id).toString();
            const filename = "Map%1".format(id.padZero(3));
            fs.writeFileSync("data/" + filename + "_combined.json", JSON.stringify(map));
            console.log("Mapper: Maps have been merged.");
        }
    }
};

Mapper_DataManager.prototype.loadDataFile = function (name, src, id) {
    const xhr = new XMLHttpRequest();
    const url = "data/" + src;
    xhr.open("GET", url);
    xhr.overrideMimeType("application/json");
    xhr.onload = () => this.onXhrLoad(xhr, name, src, url, id);
    xhr.onerror = () => this.onXhrError(name, src, url);
    xhr.send();
};

Mapper_DataManager.prototype.onXhrLoad = function (xhr, name, src, url, id) {
    if (xhr.status < 400) {
        this.onLoad(JSON.parse(xhr.responseText), id);
    } else {
        this.onXhrError(name, src, url);
    }
};
Mapper_DataManager.prototype.onXhrError = function (name, src, url) {
    const error = { name: name, src: src, url: url };
    this._loaded++; //go ahead and add 1 even if an error occurred.
    this._errors.push(error);
};

Mapper_DataManager.prototype.onLoad = function (object, id) {
    this._loaded++;
    object.id = id;
    this.createWorldSets(object);
};
Mapper_DataManager.prototype.waitForMaps = function () {
    if (this._loaded === this._loading) {
        this.build();
    }
    else {
        setTimeout(function () { this.waitForMaps() }.bind(this), 2500);
    }
};

Mapper_DataManager.prototype.getWorld = function (name) {
    if (!this.worldSets.hasOwnProperty(name)) {
        this.worldSets[name] = { name: name, xMin: null, xMax: null, yMin: null, yMax: null, mapSets: new Array() }
    }
    return this.worldSets[name];
}

Mapper_DataManager.prototype.createWorldSets = function (object) {
    //split note by line
    const result = object.note.split(/\r?\n/);
    //if note line is for world position information then 
    //create a world entry and store world specific maps 
    //in the world object
    result.forEach(str => {
        if (str.substring(0, 8) == 'worldpos') {
            let arr = str.substring(9).split(" ");

            /**Set the world attribute in each map**/
            object._world = arr[0];
            object._worldX = arr[1];
            object._worldY = arr[2];

            let world = this.getWorld(object._world);

            //get world boundaries.
            if (world.xMin > object._worldX || world.xMin == null) {
                world.xMin = object._worldX
            }
            if (world.yMin > object._worldY || world.yMin == null) {
                world.yMin = object._worldY;
            }
            if (world.xMax < object._worldX || world.xMax == null) {
                world.xMax = object._worldX;
            }
            if (world.yMax < object._worldY || world.yMax == null) {
                world.yMax = object._worldY;
            }

            if (!world.mapSets.hasOwnProperty(object._worldX)) {
                world.mapSets[object._worldX] = new Array();
            }

            world.mapSets[object._worldX][object._worldY] = object;
            this.worldSets[world.name] = world;
        }
    });
};

waitForMap = function () {
    if (DataManager.isMapLoaded()) {
        Mapper.DataManager = new Mapper_DataManager();
    }
    else {
        setTimeout(waitForMap, 2500);
    }
};

//=============================================================================
// Mapper.js
//=============================================================================
var Imported = Imported || {};
Imported.Mapper = "1.0.0";

var Mapper = Mapper || {};
/*:
* @plugindesc Mapper is a plugin that combines maps together and points to the new maps when the game is ran.// Describe your plugin
* @author Michael Stephens       // your name goes here *
* @param command      //name of a parameter you want the user to edit
* @desc command parameters       //short description of the parameter
* @default na    // set default value for the parameter
 * @help
 *
 * Plugin Command:
 * jms hello  # Say hello world in the console to test the plugin.
 * @command jms
 * @text jms
 * @desc Nothing at this time.
*/
(function () {
    waitForMap();
})();

PluginManager.registerCommand("MyPlugin", "jms", args => {
    //todo
});

/**Override loadMapData, so that the game reads the altered maps instead of the originals**/
DataManager.loadMapData = function (mapId) {
    if (mapId > 0) {
        const filename = "Map%1_combined.json".format(mapId.padZero(3));
        this.loadDataFile("$dataMap", filename);
    } else {
        this.makeEmptyMap();
    }
};


