/**
 * Copyright (c) 2013 Oculus Info Inc.
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
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

require(['./fileloader',
         './map',
         './serverrenderedmaplayer',
		 './client-rendering/TextScoreRenderer',
         './ui/SliderControl',
         './ui/CheckboxControl',
         './ui/LayerControl',
         './ui/LabeledControlSet',
         './axis/AxisUtil',
         './axis/Axis',
         './profileclass'],

        function (FileLoader, Map, ServerLayer,
                  TextScoreRenderer, SliderControl,
                  CheckboxControl, LayerControl,LabeledControlSet,
                  AxisUtil, Axis, Class ) {
            "use strict";

            var sLayerFileId = "./data/layers.json"
                // Uncomment for geographic data
                //,mapFileId = "./data/geomap.json"
                // Uncomment for non-geographic data
                ,mapFileId = "./data/emptymap.json"
                ,cLayerFileId = "./data/renderLayers.json";

            // Load all our UI configuration data before trying to bring up the ui
            FileLoader.loadJSONData(mapFileId, sLayerFileId, cLayerFileId, function (jsonDataMap) {
                // We have all our data now; construct the UI.
                var worldMap,
                    slider,
                    checkbox,
                    serverLayers,
                    renderLayer,
                    renderLayerSpecs,
                    renderLayerSpec,
                    layerIds,
                    layerId,
                    layerName,
                    layerControl,
                    makeSlideHandler,
                    makeCheckboxCheckedHandler,
                    makeCheckboxUncheckedHandler,
                    i,
                    layerControlSet,
                    layerSpecsById,
                    tooltipFcn,
                    axisSpecs,
                    mapSpecs,
                    axisSpec,
                    axes = []
                ;

                // separate axis config and map config objects
                mapSpecs = $.grep(jsonDataMap[mapFileId], function( element ) {
                    // skip any axis config objects
                    return !("AxisConfig" in element)
                });

                axisSpecs = $.grep(jsonDataMap[mapFileId], function( element ) {
                    // skip any axis config objects
                    return ("AxisConfig" in element)
                });

                // create world map from json file under mapFileId
                worldMap = new Map("map", mapSpecs);

                // create axes
                for (i=0; i<axisSpecs.length; ++i) {
                    axisSpec = axisSpecs[i].AxisConfig;
                    axisSpec.parentId = worldMap.mapSpec.id;
                    axisSpec.olMap = worldMap.map.olMap_;
                    axes.push( new Axis(axisSpec));
                }

                layerControlSet = new LabeledControlSet($('#layers-opacity-sliders'), 'layerControlSet');

                // Set up to change the base layer opacity
                layerId = 'Base Layer';
                slider = new SliderControl(layerId, 0.0, 1.0, 100);
                slider.setValue(worldMap.getOpacity());
                slider.setOnSlide(function (oldValue, slider) {
                    worldMap.setOpacity(slider.getValue());
                });

                checkbox = new CheckboxControl(layerId, true );
                checkbox.setOnChecked( function() {
                    worldMap.setVisibility(true);
                });

                checkbox.setOnUnchecked( function() {
                    worldMap.setVisibility(false);
                });

                // create layer control for base layer
                layerControl = new LayerControl(layerId);
                // add visibility checkbox to layer controls
                layerControl.addControl(layerId + '-checkbox', checkbox.getElement() );
                // add slider to layer controls
                layerControl.addControl(layerId + '-slider', slider.getElement());
                // add layer controls to control set
                layerControlSet.addControl(layerId, 'Base Layer', layerControl.getElement());


                // Set up server-rendered display layers
                serverLayers = new ServerLayer(FileLoader.downcaseObjectKeys(jsonDataMap[sLayerFileId] ));
                serverLayers.addToMap(worldMap);

                // Set up server-rendered layer controls
                layerIds = serverLayers.getSubLayerIds();
                layerSpecsById = serverLayers.getSubLayerSpecsById();

                makeSlideHandler = function (layerId) {
                    return function (oldValue, slider) {
                        serverLayers.setSubLayerOpacity(layerId, slider.getValue());
                    };
                };

                makeCheckboxCheckedHandler = function (layerId) {
                    return function() {
                        serverLayers.setSubLayerVisibility(layerId, true);
                    };
                };

                makeCheckboxUncheckedHandler = function (layerId) {
                    return function() {
                        serverLayers.setSubLayerVisibility(layerId, false);
                    };
                };

                for (i=0; i<layerIds.length; ++i) {

                    layerId = layerIds[i];
                    layerName = layerSpecsById[layerId].name;
                    if (!layerName) {
                        layerName = layerId;
                    }

                    slider = new SliderControl(layerId, 0.0, 1.0, 100);
                    slider.setValue(1);
                    slider.setOnSlide(makeSlideHandler(layerId));

                    checkbox = new CheckboxControl(layerId, true );
                    checkbox.setOnChecked(makeCheckboxCheckedHandler(layerId));
                    checkbox.setOnUnchecked(makeCheckboxUncheckedHandler(layerId));

                    // create layer control for base layer
                    layerControl = new LayerControl(layerId);
                    // add visibility checkbox control
                    layerControl.addControl(layerId + '-checkbox', checkbox.getElement() );
                    // add slider control
                    layerControl.addControl(layerId + '-slider', slider.getElement());
                    // add layer control to control set
                    layerControlSet.addControl(layerId, layerName, layerControl.getElement());
                }


                // Set up a debug layer
                // debugLayer = new DebugLayer();
                // debugLayer.addToMap(worldMap);

                // Set up client-rendered layers
                renderLayerSpecs = jsonDataMap[cLayerFileId];
                tooltipFcn = function (text) {
                    if (text) {
                        $('#hoverOutput').html(text);
                    } else {
                        $('#hoverOutput').html('');
                    }
                };

                for (i=0; i<renderLayerSpecs.length; ++i) {

                    renderLayerSpec = FileLoader.downcaseObjectKeys(renderLayerSpecs[i]);
                    layerId = renderLayerSpec.layer;

                    renderLayer = new TextScoreLayer(layerId, renderLayerSpec);
                    renderLayer.setTooltipFcn(tooltipFcn);
                    renderLayer.addToMap(worldMap);

                    layerName = renderLayerSpec.name;
                    if (!layerName) {
                        layerName = layerId;
                    }

                    /*
                    slider = new SliderControl(layerId, 0.0, 1.0, 100);
                    slider.setValue(1);
                    slider.setOnSlide(makeSlideHandler(layerId));

                    checkbox = new CheckboxControl(layerId, true );
                    checkbox.setOnChecked(makeCheckboxCheckedHandler(layerId));
                    checkbox.setOnUnchecked(makeCheckboxUncheckedHandler(layerId));
                     */

                    // create layer control for base layer
                    layerControl = new LayerControl(layerId);
                    // add visibility checkbox control
                    /*
                    layerControl.addControl(layerId + '.checkbox', checkbox.getElement() );
                    // add slider control
                    layerControl.addControl(layerId + '.slider', slider.getElement());
                    */
                    // add layer control to control set
                    layerControlSet.addControl(layerId, layerName, layerControl.getElement());
                }

                /*
                setTimeout(function () {
                    console.log(Class.getProfileInfo());
                }, 10000);
                */
            });
        });
