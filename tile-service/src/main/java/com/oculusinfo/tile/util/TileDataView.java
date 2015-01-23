/*
 * Copyright (c) 2014 Oculus Info Inc. http://www.oculusinfo.com/
 *
 * Released under the MIT License.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
package com.oculusinfo.tile.util;

import com.oculusinfo.binning.TileData;
import com.oculusinfo.binning.TileIndex;

import java.awt.Rectangle;

/**
 * A TileData instance that wraps and provides a subset view of the data of another TileData. Effectively
 * this allows sourcing a higher level tile's data contained within a parent tile using the parent's data
 * at a lower resolution.
 *
 * @author robharper
 */
public class TileDataView<T> extends TileData<T> {

    public static <T> TileDataView<T> fromSourceAbsolute(TileData<T> source, TileIndex targetIndex) {
        TileIndex sourceIndex = source.getDefinition();
        int levelDelta = targetIndex.getLevel() - sourceIndex.getLevel();

        if (levelDelta < 0) {
            throw new IllegalArgumentException("Target index must be greater than or equal to source index in absolute tile view");
        }
        if ((targetIndex.getX() >> levelDelta) << levelDelta != sourceIndex.getX()) {
            throw new IllegalArgumentException("Target index be for tile contained within source tile");
        }
        if ((targetIndex.getY() >> levelDelta) << levelDelta != sourceIndex.getY()) {
            throw new IllegalArgumentException("Target index be for tile contained within source tile");
        }

        int tileCountRatio = 1 << levelDelta;

        // Fraction of the way through the tile that the subview should begin
        // In the case of y the axis is inverted so the end of the desired tile is the beginning of the next, hence +1
        float xPosFraction = ((float)targetIndex.getX() / tileCountRatio) - sourceIndex.getX();
        float yPosFraction = ((float)(targetIndex.getY()+1) / tileCountRatio) - sourceIndex.getY();

        int xBinStart = (int)(xPosFraction * sourceIndex.getXBins());
        // Flip the bin counts (y axis opposite direction to bin y axis)
        int yBinStart = sourceIndex.getYBins() - (int)(yPosFraction * sourceIndex.getYBins());

        return new TileDataView<>(source,
                new TileIndex(targetIndex.getLevel(), targetIndex.getX(), targetIndex.getY(), sourceIndex.getXBins()/tileCountRatio, sourceIndex.getYBins()/tileCountRatio),
                xBinStart, yBinStart);
    }



    private final TileData<T> _source;
    private final int _xOffset;
    private final int _yOffset;

    private TileDataView(TileData<T> source, TileIndex index, int xOffset, int yOffset) {
        super(index);

        _source = source;
        _xOffset = xOffset;
        _yOffset = yOffset;
    }

    public T getBin (int x, int y) {
        return _source.getBin(x + _xOffset, y + _yOffset);
    }
}
