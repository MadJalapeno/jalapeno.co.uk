import { DateTime } from "luxon";
import fs from "fs"; // Import the fs module
import path from "path"; // Import the path module
import { fileURLToPath } from "url"; // Import fileURLToPath to resolve __dirname
import { parse } from "csv-parse/sync"; // Import the csv-parse library

// Emulate __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default function(eleventyConfig) {
    eleventyConfig.addFilter("readableDate", (dateObj, format, zone) => {
        // Formatting tokens for Luxon: https://moment.github.io/luxon/#/formatting?id=table-of-tokens
        return DateTime.fromJSDate(dateObj, { zone: zone || "utc" }).toFormat(format || "dd LLLL yyyy");
    });

    eleventyConfig.addFilter("htmlDateString", (dateObj) => {
        // dateObj input: https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#valid-date-string
        return DateTime.fromJSDate(dateObj, { zone: "utc" }).toFormat('yyyy-LL-dd');
    });

  // Parse CSV files
  eleventyConfig.addFilter("parseCSV", (source) => {
    const filePath = path.join(__dirname, "src", "_data", "csv", `${source}.csv`);
    if (!fs.existsSync(filePath)) {
      console.error(`CSV file not found: ${filePath}`);
      return [];
    }

    const fileContent = fs.readFileSync(filePath, "utf-8");
    return parse(fileContent, {
      columns: true, // Parse CSV into objects with column headers as keys
      skip_empty_lines: true,
      delimiter: ';',

    });
  });

    // Get the first `n` elements of a collection.
    eleventyConfig.addFilter("head", (array, n) => {
        if(!Array.isArray(array) || array.length === 0) {
            return [];
        }
        if( n < 0 ) {
            return array.slice(n);
        }
        return array.slice(0, n);
    });

    // Return the smallest number argument
    eleventyConfig.addFilter("min", (...numbers) => {
        return Math.min.apply(null, numbers);
    });

    eleventyConfig.addFilter("split", function(value, delimiter) {
        if (typeof value === "string") {
          return value.split(delimiter);
        }
        return value;
      });

    // Return the keys used in an object
    eleventyConfig.addFilter("getKeys", target => {
        return Object.keys(target);
    });

    eleventyConfig.addFilter("filterTagList", function filterTagList(tags) {
        return (tags || []).filter(tag => ["all", "posts"].indexOf(tag) === -1);
    });

    eleventyConfig.addFilter("sortAlphabetically", strings =>
        (strings || []).sort((b, a) => b.localeCompare(a))
    );

  eleventyConfig.addFilter("ucfirst", function(value) {
    return String(value).charAt(0).toUpperCase() + String(value).slice(1);
  });
};