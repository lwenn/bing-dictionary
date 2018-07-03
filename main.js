(function() {
    const WIDTH = 300;
    const HEIGHT = 350;

    let handle = {
        container: null,
        target: null,
        clickContainer: false,
        lastWord: null,

        init: function() {
            this.initContainer();
            this.initEvent();
        },

        initEvent: function() {
            var self = this;
            document.addEventListener('mouseup', this.searchWords.bind(this));
            this.container.addEventListener('mouseup', function() {
                self.clickContainer = true;
            }, true);
        },

        initContainer: function() {
            this.container = document.createElement('div');
            this.container.className = 'bing-dictionary-container';
            document.body.appendChild(this.container);
        },

        searchWords: function (e) {
            // 点击词典内不查询
            if (this.clickContainer) {
                this.clickContainer = false;
                return;
            }

            let words = (window.getSelection ? window.getSelection().toString() : document.selection.createRange().text).trim();
            // 多于3个词的情况不查询
            if (words.split(/\s+/).length > 3) {
                return;
            }

            let se = this;
            let xhr = new XMLHttpRequest();
            se.target = e.target;
            // console.log(e.clientX, e.clientY);

            if (words) {
                if (se.lastWord === words) {
                    se.showContainer(e, true);
                    return;
                }
                se.lastWord = words;
                se.showContainer(e);
                xhr.open('get', '//cn.bing.com/dict/search?q=' + words);
                // cros 跨域
                xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
                xhr.send();
                xhr.onreadystatechange = onStateChange;
            } else {
                se.hideTranslation();
            }
    
            function onStateChange() {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        let result = xhr.responseText;
                        // console.log(result);
                        se.showTranslation(e, se.getContentElement(result));
                    }
                }
            }
        },

        getContentElement: function(result) {
            // console.log(se.parseHtml(result));
            let res = result.match(/<body.*?>([\s\S]*)<\/body>/);
            // 过滤外部资源
            let html = res[1].replace(/(<script[\s\S]*?\/script>|<style[\s\S]*?\/style>|<link[\s\S]*?>|<img[\s\S]*?>)/g, '');
            // console.log(html);
            this.container.innerHTML = html;
            let content = this.container.querySelector('.content .qdef');
            if (content) {
                // 把链接修改成正确的地址
                let links = content.querySelectorAll('a');
                for (let i = 0; i < links.length; i++) {
                    if (!/javascript:|https|http/.test(links[i].href)) {
                        links[i].target = '_blank';
                        links[i].href = '//cn.bing.com' + links[i].getAttribute('href');
                    }
                }
            }
            this.container.innerHTML = '';
            return content;
        },

        parseHtml: function (html) {
            let scanHtml = html;
            let buffer = new Stack(); // 存取未闭合标签
            // let domObj = []; // 存储DOM结构
            let startP = /(<(?!\/)(\w*?)>)/; // 开始标签
            let endP = /(<\/(\w*?)>)/; // 闭合标签
            let startFound = false;
            let targetStart;
            let targetEnd;
    
            while (scanHtml.length) {
                let startIdx = scanHtml.search(startP);
                let startMatch1 = RegExp.$1;
                let startMatch2 = RegExp.$2;

                let endIdx = scanHtml.search(endP);
                let endMatch1 = RegExp.$1;
                let endMatch2 = RegExp.$2;
    
                if ((startIdx === -1 && !buffer.length()) || endIdx === -1) {
                    // 结束 parse
                    console.log('Finished!!!');
                    return;
                }
    
                if (startIdx > -1 && startIdx < endIdx) {
                    // 匹配到开始标签
                    scanHtml = scanHtml.substr(startIdx + startMatch1.length);
    
                    if (/\!doctype html/i.test(RegExp.$2) || /\/\s*$/.test(RegExp.$2)) {
                        console.log('match doctype or self-close tag');
                        continue;
                    }
    
                    if (/class=(?:'|")qdef(?:'|")/.test(startMatch2)) {
                        console.log('match translation start');
                        startFound = true;
                        targetStart = startIdx;
                    } else if (!startFound) {
                        // 不匹配词典释义
                        continue;
                    }
                    let arr = startMatch2.trim().split(/\s+/);
                    let tag = arr.splice(0, 1)[0];
                    // let obj = {tag: tag};
                    // for (let i of arr) {
                    //     let pair = i.split('=');
                    //     obj[pair[0]] = pair[1].replace(/"|'/g, '');
                    // }
                    buffer.push(tag);console.log('buffer', buffer)
                    // let domItem = domObj[0];
                    // for (let i = 0; i < buffer.length() - 1; i++) {
                    //     if (!domItem.children) {
                    //         domItem.children = [];
                    //     }
                    //     domItem = domItem.children[domItem.children.length - 1];
                    // }
    
                } else {
                    scanHtml = scanHtml.substr(endIdx + endMatch1.length);
                    
                    if (endMatch2 === buffer.last()) {
                        // 匹配到闭合标签
                        buffer.pop();
                        targetEnd = endIdx + endMatch1.length;
                    }
                }
            }
    
            return html.substring(targetStart, targetEnd);
        },

        /** 
         * @param e 事件对象
         * @param showLast 是否显示上一次查询结果
         */
        showContainer: function (e, showLast) {
            if (!showLast) {
                this.container.innerHTML = '';
                this.container.className += ' loading';
                this.container.style = `width: ${WIDTH}px; min-height: 50px;`;
            }

            // let domRect = this.target.getBoundingClientRect();
            // let posLeft = domRect.left + pageXOffset - WIDTH / 2 + this.target.offsetWidth / 2;
            // this.container.style.top = domRect.top + pageYOffset + this.target.offsetHeight + 'px';
            this.container.style.display = 'block';

            let conWdith = this.container.offsetWidth;
            let posTop = e.clientY + pageYOffset + 20;
            let posLeft = e.clientX + pageXOffset - conWdith / 2;
            posLeft = posLeft < 0 ? 0 : (
                posLeft > document.body.scrollWidth - conWdith ? 
                document.body.scrollWidth - conWdith : 
                posLeft
            );

            this.container.style.top = posTop + 'px';
            this.container.style.left = posLeft + 'px';
            this.container.scrollTo(0, 0);
        },

        /** 
         * @param e 事件对象
         * @param content 查询结果的 DOM 结点
         * @param showLast 是否显示上一次查询结果
         */
        showTranslation: function (e, content) {
            this.container.className = this.container.className.replace(' loading', '');
            if (!content) {
                content = document.createElement('div');
                content.innerText = '无查询结果';
                content.style = 'text-align: center';
            }
            let div = document.createElement('div');
            div.style = `max-height: ${HEIGHT}px`;
            div.appendChild(content);
            this.container.appendChild(div);
        },

        hideTranslation: function() {
            this.container.style.display = 'none';
        }
    };

    handle.init();

}());