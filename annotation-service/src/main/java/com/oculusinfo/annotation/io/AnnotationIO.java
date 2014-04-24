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
package com.oculusinfo.annotation.io;

import java.io.IOException;
import java.util.List;

import com.oculusinfo.annotation.*;
import com.oculusinfo.annotation.io.serialization.*;
import com.oculusinfo.binning.*;
import com.oculusinfo.binning.io.*;
import com.oculusinfo.binning.util.*;

public interface AnnotationIO extends PyramidIO{
   
	
	/*
	 * Write
	 */
    public void writeData (String id, 
					       AnnotationSerializer<AnnotationData<?>> serializer, 
					       Iterable<AnnotationData<?>> data ) throws IOException;

    /*
     * Read
     */  
    public List<AnnotationData<?>> readData (String id, 
								             AnnotationSerializer<AnnotationData<?>> serializer,
								             List<Pair<String,Long>> references) throws IOException;
 
    /*
     * Delete
     */
    public void removeTiles (String id, Iterable<TileIndex> tiles ) throws IOException;
    public void removeData (String id, Iterable<AnnotationData<?>> data ) throws IOException;
  
}
