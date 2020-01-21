const fs = require("fs");
const axios = require("axios");
const inquirer = require("inquirer");
const path = require("path");
const pdf = require('html-pdf');
const generateHTML = require("./generateHTML.js");
var defaultPdfFileName = path.resolve( __dirname + "/output.pdf");
var defaultHtmlFilename = path.resolve( __dirname + "/output.html");

var userProfile = {
    color: "pink",
    avatar_url: "",
    name: "",
    company: "",
    bio: "",
    location: "",
    html_url: "",
    blog: "",
    public_repos: 0,
    followers: 0,
    following: 0,
    starredNum: 0
};

// There are be entered by user prompt.
var username; // This is git username. 
var pdfFilename; 
var htmlFilename;

inquirer
  .prompt([{
    type: "input",
    message: "Enter your GitHub username: ",
    name: "username"
  }, {
    type: "list",
    message: "Choose color: ",
    name: "color",
    choices: ["green", "blue", "pink", "red"],
    default: "pink"
  }, {
    type: "input",
    message: "Enter output PDF filename: ",
    name: "pdfFilename",
    default: defaultPdfFileName    
  }, {
    type: "input",
    message: "Enter output HTML filename: ",
    name: "htmlFilename",
    default: defaultHtmlFilename
  }
  ])
  .then(getDataFromWeb)
  .catch(() => {console.log("Error in Inquirer.")});


function getDataFromWeb(ans) { 
    var promiseGetUserInfo = new Promise(function(resolve, reject) {
        // console.log("--- promiseGetUserInfo start ---");
        username = ans.username;
        userProfile.color = ans.color;
        htmlFilename = ans.htmlFilename;
        pdfFilename = ans.pdfFilename;

        // console.log(username);
        const usersUrl = `https://api.github.com/users/${username}`;
        axios.get(usersUrl)
            .then((res) => {
                // TODO: Need error handling for null.
                //console.log(res.data);
                userProfile.avatar_url = res.data.avatar_url;
                if (res.data.name === null) { 
                    userProfile.name = " ";
                } else {
                    userProfile.name = res.data.name;
                }
                if (res.data.company === null) {
                    userProfile.company = " ";
                } else {
                    userProfile.company = res.data.company;
                }
                if (res.data.location === null) {
                    userProfile.location = " ";
                } else {
                    userProfile.location = res.data.location;
                }
                if (res.data.bio === null) {
                    userProfile.bio = " ";
                } else {
                    userProfile.bio = res.data.bio;
                }
                userProfile.html_url = res.data.html_url;
                userProfile.blog = res.data.blog;
                userProfile.public_repos = res.data.public_repos;
                userProfile.followers = res.data.followers;
                userProfile.following = res.data.following;
                // console.log("--- promiseGetUserInfo end ---");
                resolve();
            })
            .catch((error) => {
                if (error.response.status == "404"){ 
                    console.log(`Error: Specified user does not exist. ${error.response.status} ${error.response.statusText}`);
                } else { 
                    console.log(`Error: ${error.response.status} ${error.response.statusText}`)
                }
                reject();
            })
    });
    
    // The number of stars needs to be obtained from another URL. 
    // If there are more stars which does not fit into one page, the URL must be called multiple times.
    var promiseGetStarred = new Promise(function(resolve, reject) { 
        // console.log("=== promiseGetStarred start ===");
        const starredUrl = `https://api.github.com/users/${username}/starred?per_page=30`;
        axios.get(starredUrl)
        .then((res) => { 
            // Read this doc. https://developer.github.com/v3/guides/traversing-with-pagination/
            // res.headers.link extracts 'Link' in HTTP response HEADER. 
            // You will get something like this if there are more than 30 (or per_page) entries. (30 is default when per_page paramater is not given.)
            //Link: <https://api.github.com/user/9385814/starred?per_page=30&page=2>; rel="next", <https://api.github.com/user/9385814/starred?per_page=30&page=3>; rel="last"
            const link = res.headers.link;
            //console.log(link);
            if (typeof link!=='undefined'){
                // 'link' exists in header, if there is more than one page
                // Extract the last page number
                let linksplit = link.split(",");
                let lastPageNumTemp = linksplit[1].match(/[&?]page=[0-9]*/g);
                let lastPageNum = lastPageNumTemp[0].match(/[0-9]+/);
                // console.log("lastpageNum: ", lastPageNum[0]);
                let StarredNumInLastPage = 0;
    
                // Get Starred Num from last page.
                const starredLastPageUrl = `https://api.github.com/users/${username}/starred?page=${lastPageNum}&per_page=30`;
                axios.get(starredLastPageUrl)
                .then((res) => { 
                    StarredNumInLastPage = res.data.length;
                    userProfile.starredNum = (30 * (lastPageNum - 1)) + StarredNumInLastPage ;
                    // console.log("starredNum: "+ userProfile.starredNum);
                    // console.log("=== promiseGetStarred end ===");
                    resolve();
                })
                .catch(() => {
                    if (error.response.status == "404"){ 
                        console.log(`Error: Specified user does not exist. ${error.response.status} ${error.response.statusText}`);
                    } else { 
                        console.log(`Error: ${error.response.status} ${error.response.statusText}`)
                    }
                    reject();    
                });
            } else {
                // 'link' does not exist 
                userProfile.starredNum = res.data.length;
                // console.log("starredNum: "+ userProfile.starredNum);
                // console.log("=== promiseGetStarred end ===");
                resolve();
            }
        })
        .catch((error) => { 
            if (error.response.status == "404"){ 
                console.log(`Error: Specified user does not exist. ${error.response.status} ${error.response.statusText}`);
            } else { 
                console.log(`Error: ${error.response.status} ${error.response.statusText}`)
            }        
        })
    })

    Promise.all([promiseGetUserInfo, promiseGetStarred])
        .then(printValues)
        .catch(() => {});
}

function printValues(){ 
    // console.log(userProfile);
    const HTMLstr = generateHTML.createHTML(userProfile);
    // console.log(HTMLstr);

    fs.writeFile(htmlFilename, HTMLstr, (err) => {
        if (err){
            console.log("File write error. " + err);   
        } else {
            console.log("Written to " + htmlFilename);   
        }
    })

    pdf.create(HTMLstr).toFile(pdfFilename, (err, res) => {
        if (err) {
            // BUG: This API does not return err even if you specify invalid filename.
            // For examle, invalid drive name k:\output.pdf  
            console.log("Write PDF file error." + err);
        } else {
            console.log("Written to: " +  res.filename); 
        }
      });
};
