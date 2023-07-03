/* Magic Mirror
 * Module: MMM-uv-index
 * Version: 1.0.1
 *
 * By Piotr Kucharski (https://github.com/Sketusky/MMM-uv-index)
 * MIT Licensed.
 */
Module.register("MMM-uv-index", {

    defaults: {
        lat: null,
        lon: null,
        appid: "",
        colors: true,

        updateInterval: 60 * 60 * 1000, // every 1 hour
        animationSpeed: 1000,

        initialLoadDelay: 0, // 0 seconds delay
        retryDelay: 2500,

        apiVersion: "3.0",
        apiBase: "https://api.openweathermap.org/data/",
        uvEndpoint: "onecall",

    },

    getStyles: function() {
        return ["uv-index.css"];
    },

    getTranslations: function() {
        return {
            en: 'translations/en.json',
            pl: 'translations/pl.json'
        }
    },

    start: function() {
        Log.info("Starting module: " + this.name);

        this.value = null;
        this.date = null;
        this.loaded = false;
        this.scheduleUpdate(this.config.initialLoadDelay);
    },

    getDom: function() {
        var wrapper = document.createElement("div");

        if (this.config.appid === "") {
            wrapper.innerHTML = "Please set the correct openuv <i>appid</i> in the config for module: " + this.name + ".";
            wrapper.className = "dimmed light small";
            return wrapper;
        }

        if (!this.loaded) {
            wrapper.innerHTML = this.translate("LOADING");
            wrapper.className = "dimmed light small";
            return wrapper;
        }

        var table = document.createElement("table");
        table.className = "small";

        var row = document.createElement("tr");

        table.appendChild(row);

        var valueColumn = document.createElement("td");
        valueColumn.className = "small value";
        valueColumn.innerHTML = this.value;
        row.appendChild(valueColumn);

        var scaleColumn = document.createElement("td");
        scaleColumn.className = "small scale align-right " + this.colorValue(this.value);
        scaleColumn.innerHTML = this.scaleValue(this.value);
        row.appendChild(scaleColumn);

        wrapper.appendChild(table);

        return wrapper;
    },

    scaleValue: function(value) {
        if (value <= 2.0) {
            return this.translate('low');
        } else if (value <= 5.0) {
            return this.translate('moderate');
        } else if (value <= 7.0) {
            return this.translate('high');
        } else if (value <= 10.0) {
            return this.translate('veryHigh');
        } else {
            return this.translate('extreme');
        }
    },

    colorValue: function(value) {
        if(this.config.colors) {
            if (value <= 2.0) {
                return "green";
            } else if (value <= 5.0) {
                return "yellow";
            } else if (value <= 7.0) {
                return "orange";
            } else if (value <= 10.0) {
                return "red";
            } else {
                return "violet";
            }
        }
        return "";
    },

    updateUV: function() {
        if (this.config.appid === "") {
            Log.error("Currentuv: APPID not set!");
            return;
        }

        var url = this.config.apiBase + this.config.apiVersion + "/" + this.config.uvEndpoint + this.getParams();
        var self = this;
        var retry = true;

        var uvRequest = new XMLHttpRequest();
        uvRequest.open("GET", url, true);
        uvRequest.onreadystatechange = function() {
            if (this.readyState === 4) {
                if (this.status === 200) {
                    self.processUV(JSON.parse(this.response));
                } else if (this.status === 401) {
                    self.updateDom(self.config.animationSpeed);

                    Log.error(self.name + ": Incorrect APPID.");
                    retry = true;
                } else {
                    Log.error(self.name + ": Could not load uv.");
                }

                if (retry) {
                    self.scheduleUpdate((self.loaded) ? -1 : self.config.retryDelay);
                }
            }
        };
        uvRequest.send();
    },

    getParams: function() {
        var params = "?";
        if (this.config.lat) {
            params += "lat=" + this.config.lat;
        } else {
            this.hide(this.config.animationSpeed, {
                lockString: this.identifier
            });
            return;
        }

        params += "&lon=" + this.config.lon;
        params += "&APPID=" + this.config.appid;

        return params;
    },

    processUV: function(data) {
        if (!data || typeof data.current.uvi === "undefined") {
            // Did not receive usable new data.
            // Maybe this needs a better check?
            return;
        }

        this.value = data.current.uvi;

        this.show(this.config.animationSpeed, {
            lockString: this.identifier
        });
        this.loaded = true;
        this.updateDom(this.config.animationSpeed);
        this.sendNotification("CURRENTUV_DATA", {
            data: data
        });
    },

    scheduleUpdate: function(delay) {
        var nextLoad = this.config.updateInterval;
        if (typeof delay !== "undefined" && delay >= 0) {
            nextLoad = delay;
        }

        var self = this;
        setTimeout(function() {
            self.updateUV();
        }, nextLoad);
    },

});
