const fs = require("fs");
const axios = require("axios");
const inquirer = require("inquirer");
var pdf = require('html-pdf');
var generateHTML = require("./generateHTML.js");

var username; // This is git username. To be entered by user prompt. 
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

inquirer
  .prompt({
    message: "Enter your GitHub username: ",
    name: "username"
  })
  .then(getDataFromWeb)
  .catch(() => {console.log("Error in Inquirer.")});


function getDataFromWeb(ans) { 
    var promiseGetUserInfo = new Promise(function(resolve, reject) {
        // console.log("--- promiseGetUserInfo start ---");
        username = ans.username;
        // console.log(username);
        const usersUrl = `https://api.github.com/users/${username}`;
        axios.get(usersUrl)
            .then(function(res) {
                //console.log(res.data);
                userProfile.avatar_url = res.data.avatar_url;
                userProfile.name = res.data.name;
                userProfile.company = res.data.company;
                userProfile.location = res.data.location;
                userProfile.bio = res.data.bio;
                userProfile.html_url = res.data.html_url;
                userProfile.blog = res.data.blog;
                userProfile.public_repos = res.data.public_repos;
                userProfile.followers = res.data.followers;
                userProfile.following = res.data.following;
                // console.log("--- promiseGetUserInfo end ---");
                resolve();
            })
            .catch(function(error){
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
        .then(function(res){ 
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
                .then(function(res) { 
                    StarredNumInLastPage = res.data.length;
                    userProfile.starredNum = (30 * (lastPageNum - 1)) + StarredNumInLastPage ;
                    // console.log("starredNum: "+ userProfile.starredNum);
                    // console.log("=== promiseGetStarred end ===");
                    resolve();
                })
                .catch( () => {
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

    fs.writeFile("output.html", HTMLstr, function(){
        console.log("Written to output.html");   
    })

    pdf.create(HTMLstr).toFile('./output.pdf', function(err, res) {
        if (err) return console.log(err);
        console.log(res); // { filename: 'output.pdf' }
      });

};
