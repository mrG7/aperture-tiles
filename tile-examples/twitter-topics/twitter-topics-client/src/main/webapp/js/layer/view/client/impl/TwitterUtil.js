/*
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


define(function (require) {
    "use strict";

    return {

        /*
            Return the count of node entries, clamped at MAX_COUNT
        */
        getTagCount : function( values, max ) {
            var MAX_COUNT = max || 5;
            return Math.min( values.length, MAX_COUNT );
        },

        /*
            Return the count of recent tweets entries, clamped at MAX_COUNT
        */
        getTweetCount : function( value ) {
            return value.recentTweets.length;
        },


        getPercentageByType: function( value, timeIndex, type ) {

            // Array counts are inverted, 0 is most recent
            var attrib = 'count' + type,
                count = this.getParentCount( value, type),
                length = value[attrib].length;
            if (count === 0) {
                return 0;
            }
            return value[attrib][length - 1 - timeIndex] / count;
        },


        /*
            Returns the total count of all tweets in a node
        */
        getTotalCount : function( values ) {

            var i,
                sum = 0,
                n = this.getTagCount( values );
            for (i=0; i<n; i++) {
                sum += values[i].countMonthly;
            }
            return sum;
        },


        /*
            Returns the percentage of tweets in a node for the respective tag
        */
        getTotalCountPercentage : function( values, index ) {
            return ( values[index].countMonthly / this.getTotalCount( values ) ) || 0;
        },


        getParentCount: function( value, type ) {

            // Array counts are inverted, 0 index is most recent
            var i,
                count = 0;

            switch(type) {
                case 'Daily':
                    count = value.countMonthly;
                    break;
                case 'Per6hrs':
                    for (i = 0; i<7; i++) {
                        count += value.countDaily[i];
                    }
                    break;
                case 'PerHour':
                    count = value.countDaily[0];
                    break;
            }
            return count;
        },


         getMaxPercentageByType: function( value, type) {
            var i,
                percent,
                maxPercent = 0,
                count = this.getParentCount( value, type );
            if (count === 0) {
                return 0;
            }
            for (i=0; i<value['count' + type].length; i++) {
                // get maximum percent
                percent = value['count' + type][i] / count;
                if (percent > maxPercent) {
                    maxPercent = percent;
                }
            }
            return maxPercent;
        },


        /*
            Returns a font size based on the percentage of tweets relative to the total count
        */
        getFontSize : function( values, index, minFontSize, maxFontSize ) {
            var fontRange = maxFontSize - minFontSize,
                sum = this.getTotalCount( values, index ),
                percentage = this.getTotalCountPercentage( values, index ),
                scale = Math.log( sum ),
                size = ( percentage * fontRange * scale ) + ( minFontSize * percentage );
            return Math.min( Math.max( size, minFontSize), maxFontSize );
        },


        /*
            Returns a trimmed string based on character limit
        */
        trimLabelText : function( str, charCount ) {
            var MAX_LABEL_CHAR_COUNT = charCount || 9;
            if (str.length > MAX_LABEL_CHAR_COUNT) {
                str = str.substr( 0, MAX_LABEL_CHAR_COUNT ) + "...";
            }
            return str;
        },


        getMonth: function( value ) {
            var month = new Date( value.endTimeSecs * 1000 ).getMonth();
            switch(month) {
                case 0: return "Jan";
                case 1: return "Feb";
                case 2: return "Mar";
                case 3: return "Apr";
                case 4: return "May";
                case 5: return "Jun";
                case 6: return "Jul";
                case 7: return "Aug";
                case 8: return "Sep";
                case 9: return "Oct";
                case 10: return "Nov";
                default: return "Dec";
            }
        },


        getLastWeekOfMonth: function( value ) {
            var lastDay = this.getLastDayOfMonth( value ),
                i,
                week = [];
            function numToDay(num) {
                switch (num) {
                    case 0: return "Su";
                    case 1: return "Mo";
                    case 2: return "Tu";
                    case 3: return "We";
                    case 4: return "Th";
                    case 5: return "Fr";
                    case 6: return "Sa";
                }
            }
            for (i=0; i<7; i++) {
                week.push( numToDay( (lastDay + i) % 7 ) );
            }
            return week;
        },


        getLastDayOfMonth: function( value ) {
            return new Date( value.endTimeSecs * 1000 ).getDay();
        },


        getTotalDaysInMonth: function( value ) {
            return new Date( value.endTimeSecs * 1000 ).getDate();
        },


        /*
            Returns a string of the format "Month ##, year:" from a unix timestamp
        */
        getDay : function( timestamp ) {
        
            function getMonth( date ) {
                var month = date.getMonth();
                switch(month) {
                    case 0: return "January";
                    case 1: return "February";
                    case 2: return "March";
                    case 3: return "April";
                    case 4: return "May";
                    case 5: return "June";
                    case 6: return "July";
                    case 7: return "August";
                    case 8: return "September";
                    case 9: return "October";
                    case 10: return "November";
                    default: return "December";
                }
            }
            var date = new Date( timestamp ),
                month = getMonth( date ),
                year =  date.getFullYear(),
                day = date.getDate();

            return month + " " + day + ", " + year + ":";
        },

        /*
            Returns a string of the format "HH:MM:SS xm" from a unix timestamp
        */
        getTime : function( timestamp ) {

            function padZero( num ) {
                return ("0" + num).slice(-2);
            }
            var date = new Date( timestamp ),
                hours = date.getHours(),
                minutes = padZero( date.getMinutes() ),
                seconds = padZero( date.getSeconds() ),
                suffix = (hours >= 12) ? 'pm' : 'am';
            // ensure hour is correct
            hours = ( hours === 0 || hours === 12 ) ? 12 : hours % 12;
            return hours + ':' + minutes + ':' + seconds + " " + suffix;
        },

        /*
            Buckets recent tweets by day
        */
        getRecentTweetsByDay : function( value ) {
            // bucket tweets by day
            var days = {},
                count = this.getTweetCount( value ),
                time, day, recent, i;
            for (i=0; i<count; i++) {
                recent = value.recentTweets[i];
                time = recent.time;
                day = this.getDay( time*1000 );
                days[day] = days[day] || [];
                days[day].push({
                    tweet: recent.tweet,
                    time: this.getTime( time*1000 )
                });
            }
            return days;
        },

        /*
            Centre map between tile and details on demand pane
        */
        centreForDetails: function( map, data ) {
            var viewportPixel = map.getViewportPixelFromCoord( data.longitude, data.latitude ),
                panCoord = map.getCoordFromViewportPixel( viewportPixel.x + map.getTileSize(),
                                                          viewportPixel.y + map.getTileSize() );
            map.panToCoord( panCoord.x, panCoord.y );
        }


    };

});