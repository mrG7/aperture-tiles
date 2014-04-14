/*
 * Copyright (c) 2014 Oculus Info Inc.
 * http://www.oculusinfo.com/
 *
 * Released under the MIT License.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
 * of the Software, and to permit persons to whom the Software is furnished to do
 * so, subject to the following conditions:

 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.

 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

/* JSLint global declarations: these objects don't need to be declared. */
/*global OpenLayers */

/**
 * This module defines a AnnotationService class which manages all annotation data requests
 * and storage from the server.
 */
define(function (require) {
    "use strict";

    var DataService = require('../layer/DataService'),
        TileAnnotationIndexer = require('./TileAnnotationIndexer'),
        AnnotationService;


    AnnotationService = DataService.extend({
        ClassName: "AnnotationService",

        /**
         * Construct an AnnotationService
         */
        init: function ( layer ) {

            this._super();
            this.layer = layer;
            this.indexer = new TileAnnotationIndexer();
        },


        getDataFromServer: function(requestedTiles, callback) {
            var i;
            // send request to respective coordinator
            for (i=0; i<requestedTiles.length; ++i) {
                this.getRequest( requestedTiles[i], callback );
            }
        },


        getRequest: function(tilekey, callback) {

            var parsedValues = tilekey.split(','),
                level = parseInt(parsedValues[0], 10),
                xIndex = parseInt(parsedValues[1], 10),
                yIndex = parseInt(parsedValues[2], 10);

            if (this.dataStatus[tilekey] === undefined) {

                // flag tile as loading, add callback to list
                this.dataStatus[tilekey] = "loading";
                this.getCallbacks[tilekey] = [];
                this.getCallbacks[tilekey].push(callback);

                // request data from server
                aperture.io.rest(
                    ('/annotation/'+
                     this.layer+'/'+
                     level+'/'+
                     xIndex+'/'+
                     yIndex+'.json'),
                     'GET',
                    $.proxy( this.getCallback, this )
                );
                this.addReference(tilekey);

            } else {

                this.addReference(tilekey);
                if (this.dataStatus[tilekey] === "loaded") {
                    return; // data is in memory
                }
                // waiting on tile from server, add to callback list
                this.getCallbacks[tilekey].push(callback);
            }

        },

        /**
         *
         * @param annotationData annotation data received from server of the form:
         *
         *  {
         *      index: {
         *                  level:
         *                  xIndex:
         *                  yIndex:
         *             }
         *      data: {
         *                  <binkey>: [ <annotation>, <annotation>, ... ]
         *                  <binkey>: [ <annotation>, <annotation>, ... ]
         *            }
         *  }
         *
         */
        getCallback: function( annotationData ) {

            // create tile key: "level, xIndex, yIndex"
            var tilekey = this.createTileKey( annotationData.index ),
                i;

            this.data[tilekey] = annotationData.data;
            this.dataStatus[tilekey] = "loaded"; // flag as loaded

            if ( !$.isEmptyObject( this.data[tilekey] ) ) {

                if (this.getCallbacks[tilekey] === undefined) {
                    console.log('ERROR: Received annotation data out of sync from server... ');
                    return;
                }

                for (i =0; i <this.getCallbacks[tilekey].length; i++ ) {
                    this.getCallbacks[tilekey][i]( this.data[tilekey] );
                }
            }

            delete this.getCallbacks[tilekey];
        },


        postRequest: function( type, annotation ) {

            type = type.toLowerCase();

            switch ( type ) {

                case "write":

                    // add annotation to client cache
                    this.addAnnotationToData( annotation );
                    break;

                case "modify":

                    // replace old entry with new annotation in client cache
                    this.modifyAnnotationInData( annotation.old, annotation['new'] );
                    break;

                case "remove":

                    // remove entry
                    this.removeAnnotationFromData( annotation );
                    break;
            }

            // Request the layer information
            aperture.io.rest('/annotation',
                             'POST',
                             $.proxy(this.postCallback, this),
                             {
                                 postData: {    "layer": this.layer,
                                                "type": type,
                                                "annotation" : annotation
                                            },
                                 contentType: 'application/json'
                             });

        },


        postCallback: function( postResult ) {

            console.log("DEBUG: POST complete: "+ postResult );

        },


        addAnnotationToData: function( annotation ) {

            // get all tile indices
            var indices = this.indexer.getIndices( annotation ),
                tile,
                i;

            // if tile exists in cache, add new data, if not, ignore it
            for (i=0; i<indices.length; i++) {

                tile = this.data[ indices[i].tilekey ];

                // if tilekey exists
                if ( tile !== undefined ) {

                    // create bin if not there
                    if ( tile[ indices[i].binkey ] === undefined ) {
                        tile[ indices[i].binkey ] = [];
                    }
                    tile[ indices[i].binkey ].push( annotation );
                    console.log( "added to tile: " + indices[i].tilekey + ", and bin: " + indices[i].binkey );
                }
                // if tilekey does not exist, it is not in cache, and doesn't need to be added, as it
                // will need to be pulled anyway
            }
        },


        removeAnnotationFromData: function( annotation ) {

            // get all tile indices
            var indices = this.indexer.getIndices( annotation ),
                tile,
                bin,
                index,
                i;

            function compare( a, b ) {

                return a.x === b.x &&
                       a.y === b.y &&
                       a.priority === b.priority &&
                      (a.data.title.localeCompare( b.data.title ) === 0) &&
                      (a.data.comment.localeCompare( b.data.comment ) === 0);
            }

            function findIndex( array, data ) {
                var i;
                for (i=0; i< array.length; i++) {
                    if ( compare(array[i], data) ) {
                        return i;
                    }
                }
                return -1;
            }

            // if tile exists in cache, remove data from it
            for (i=0; i<indices.length; i++) {

                tile = this.data[ indices[i].tilekey ];

                // if tile exists in cache
                if ( tile !== undefined ) {
                    // get bin
                    bin = tile[ indices[i].binkey ];
                    // if bin exists in cache
                    if ( bin !== undefined ) {

                        // get index in bin
                        index = findIndex( bin, annotation );
                        // remove data
                        if ( index > -1 ) {
                            console.log( "removed from tile: " + indices[i].tilekey + ", and bin: " + indices[i].binkey );
                            bin.splice(index, 1);
                        } else {
                            console.log( "not found in bin: " + indices[i].binkey );
                        }

                        // remove bin from tile if it is now empty
                        if ( bin.length === 0 ) {
                            delete tile[ indices[i].binkey ];
                        }
                    }
                }

            }

        },


        modifyAnnotationInData: function( oldAnnotation, newAnnotation ) {

            // remove from old
            this.removeAnnotationFromData( oldAnnotation );

            // add to new
            this.addAnnotationToData( newAnnotation );
        }

    });

    return AnnotationService;
});
