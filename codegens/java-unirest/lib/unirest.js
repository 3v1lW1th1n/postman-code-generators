var _ = require('./lodash'),
  sanitizeOptions = require('./util').sanitizeOptions,

  parseRequest = require('./parseRequest');

//  Methods supported by Java Unirest Library
const SUPPORTED_METHODS = ['GET', 'POST', 'PUT', 'HEAD', 'PATCH', 'DELETE', 'OPTIONS'];

/**
 * parses request and returns java unirest code snippet
 *
 * @param {Object} request - Postman SDK Request Object
 * @param {String} indentString - indentation required for code snippet
 * @param {Object} options
 * @return {String} - java unirest code snippet
 */
function makeSnippet (request, indentString, options) {
  var snippet = '',
    urlString = parseRequest.getUrlStringfromUrlObject(request.url);

  if (options.requestTimeout > 0) {
    snippet += `Unirest.setTimeouts(0, ${options.requestTimeout});\n`;
  }
  else {
    snippet += 'Unirest.setTimeouts(0, 0);\n';
  }

  if (!options.followRedirect) {
    snippet += 'Unirest.setHttpClient(org.apache.http.impl.client.HttpClients.custom()\n' +
                   indentString + '.disableRedirectHandling()\n' +
                   indentString + '.build());\n';
  }

  snippet += 'HttpResponse<String> response = Unirest.';

  //  since unirest supports only six HTTP request methods
  if (_.includes(SUPPORTED_METHODS, request.method)) {
    snippet += `${request.method.toLowerCase()}("${urlString}")\n`;
  }
  else {
    console.warn(request.method + ' method isn\'t supported by Unirest java library');
    snippet += `get("${urlString}")\n`;
  }
  snippet += parseRequest.parseHeader(request, indentString);
  snippet += parseRequest.parseBody(request, indentString, options.trimRequestBody);
  snippet += indentString + '.asString();\n';

  return snippet;
}

/**
 * Specifies the additional options applicable to this code generator other than standard options
 *
 * @returns {Array} - Array of the particular options applicable to java unirest
 */
function getOptions () {
  return [
    {
      name: 'Include boilerplate',
      id: 'includeBoilerplate',
      type: 'boolean',
      default: false,
      description: 'Include class definition and import statements in snippet'
    },
    {
      name: 'Set indentation count',
      id: 'indentCount',
      type: 'positiveInteger',
      default: 2,
      description: 'Set the number of indentation characters to add per code level'
    },
    {
      name: 'Set indentation type',
      id: 'indentType',
      type: 'enum',
      availableOptions: ['Tab', 'Space'],
      default: 'Space',
      description: 'Select the character used to indent lines of code'
    },
    {
      name: 'Set request timeout',
      id: 'requestTimeout',
      type: 'positiveInteger',
      default: 0,
      description: 'Set number of milliseconds the request should wait for a response ' +
        'before timing out (use 0 for infinity)'
    },
    {
      name: 'Follow redirects',
      id: 'followRedirect',
      type: 'boolean',
      default: true,
      description: 'Automatically follow HTTP redirects'
    },
    {
      name: 'Trim request body fields',
      id: 'trimRequestBody',
      type: 'boolean',
      default: false,
      description: 'Remove white space and additional lines that may affect the server\'s response'
    }
  ];
}

/**
 * Converts postman sdk request object into http snippet for java unirest
 *
 * @param {Object} request - postman-SDK request object
 * @param {Object} options
 * @param {String} options.indentType - type for indentation eg: Space, Tab
 * @param {String} options.indentCount - number of spaces or tabs for indentation.
 * @param {Boolean} [options.includeBoilerplate] - indicates whether to include class defination in java
 * @param {Boolean} options.followRedirect - whether to enable followredirect
 * @param {Boolean} options.trimRequestBody - whether to trim fields in request body or not
 * @param {Number} options.requestTimeout : time in milli-seconds after which request will bail out
 * @param {Function} callback - callback function with parameters as (error, snippet)
 */
function convert (request, options, callback) {

  if (!_.isFunction(callback)) {
    throw new Error('Java-Unirest-Converter: callback is not valid function');
  }
  options = sanitizeOptions(options, getOptions());
  //  String representing value of indentation required
  var indentString,

    //  code snippets to include java class definition according to options
    headerSnippet = '',
    footerSnippet = '',

    //  code snippet to create request using java unirest
    snippet = '';

  indentString = options.indentType === 'Tab' ? '\t' : ' ';
  indentString = indentString.repeat(options.indentCount);

  if (options.includeBoilerplate) {
    headerSnippet = 'import com.konghq.unirest.*;\n' +
                        'import java.io.*;\n' +
                        'public class App {\n' +
                        indentString + 'public static void main(String []args) throws Exception{\n';
    footerSnippet = indentString.repeat(2) + 'System.out.println(response.getBody());\n' +
                        indentString + '}\n}\n';
  }

  snippet = makeSnippet(request, indentString, options);

  //  if boilerplate is included then two more indentString needs to be added in snippet
  (options.includeBoilerplate) &&
    (snippet = indentString.repeat(2) + snippet.split('\n').join('\n' + indentString.repeat(2)) + '\n');

  return callback(null, headerSnippet + snippet + footerSnippet);
}
module.exports = {
  convert: convert,
  getOptions: getOptions
};
