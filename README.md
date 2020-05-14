# :octocat: Profile Generator
A command-line application that dynamically generates a PDF profile from a GitHub username.

## Screenshot 
<img src="operation.gif">


## Setup
1. Install [node.js](https://nodejs.org)

2. Install npm. Open command prompt or terminal and enter as follows.

```
$ npm install
```

## Usage 
1. Open command prompt or terminal and enter as follows.
```
$ node index.js 
```
2. Answer questions to the interactive prompt. 
Enter username, Color, PDF Filename and HTML Filename.

3. The specified files are generated by this command line application. 


## Technologies 
[Node.js](https://nodejs.org), [html-pdf](https://www.npmjs.com/package/html-pdf), [inquirer](https://www.npmjs.com/package/inquirer), [Github API](https://developer.github.com/v3/)


## Known Issues
Some functionality does not work due to the bugs of PDF converter.
The converted PDF file does not look same as HTML file, as the converter does not support css flex.  
The PDF converter does not return error, even if you specify an invlid filename is spcified.
