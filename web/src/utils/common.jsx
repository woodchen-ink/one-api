import Decimal from 'decimal.js';
import { enqueueSnackbar } from 'notistack';
import { snackbarConstants } from 'constants/SnackbarConstants';
import { API } from './api';
import { CHAT_LINKS } from 'constants/chatLinks';
import { useSelector } from 'react-redux';

export function getSystemName() {
  let system_name = localStorage.getItem('system_name');
  if (!system_name) return 'CZLOapi';
  return system_name;
}

export function isMobile() {
  return window.innerWidth <= 600;
}

// eslint-disable-next-line
export function SnackbarHTMLContent({ htmlContent }) {
  return <div dangerouslySetInnerHTML={{ __html: htmlContent }} />;
}

export function getSnackbarOptions(variant) {
  let options = snackbarConstants.Common[variant];
  if (isMobile()) {
    // 合并 options 和 snackbarConstants.Mobile
    options = { ...options, ...snackbarConstants.Mobile };
  }
  return options;
}

export function showError(error) {
  if (error.message) {
    if (error.name === 'AxiosError') {
      switch (error.response.status) {
        case 429:
          enqueueSnackbar('错误：请求次数过多，请稍后再试！', getSnackbarOptions('ERROR'));
          break;
        case 500:
          enqueueSnackbar('错误：服务器内部错误，请联系管理员！', getSnackbarOptions('ERROR'));
          break;
        case 405:
          enqueueSnackbar('本站仅作演示之用，无服务端！', getSnackbarOptions('INFO'));
          break;
        default:
          enqueueSnackbar('错误：' + error.message, getSnackbarOptions('ERROR'));
      }
    }
  } else {
    enqueueSnackbar('错误：' + error, getSnackbarOptions('ERROR'));
  }
}

export function showNotice(message, isHTML = false) {
  if (isHTML) {
    enqueueSnackbar(<SnackbarHTMLContent htmlContent={message} />, getSnackbarOptions('INFO'));
  } else {
    enqueueSnackbar(message, getSnackbarOptions('INFO'));
  }
}

export function showWarning(message) {
  enqueueSnackbar(message, getSnackbarOptions('WARNING'));
}

export function showSuccess(message) {
  enqueueSnackbar(message, getSnackbarOptions('SUCCESS'));
}

export function showInfo(message) {
  enqueueSnackbar(message, getSnackbarOptions('INFO'));
}

export function copy(text, name = '') {
  try {
    navigator.clipboard.writeText(text);
  } catch (error) {
    text = `复制${name}失败，请手动复制：<br /><br />${text}`;
    enqueueSnackbar(<SnackbarHTMLContent htmlContent={text} />, getSnackbarOptions('COPY'));
    return;
  }
  showSuccess(`复制${name}成功！`);
}

export async function getOAuthState() {
  try {
    const res = await API.get('/api/oauth/state');
    const { success, message, data } = res.data;
    if (success) {
      return data;
    } else {
      showError(message);
      return '';
    }
  } catch (error) {
    return '';
  }
}

export async function onGitHubOAuthClicked(github_client_id, openInNewTab = false) {
  const state = await getOAuthState();
  if (!state) return;
  let url = `https://github.com/login/oauth/authorize?client_id=${github_client_id}&state=${state}&scope=user:email`;
  if (openInNewTab) {
    window.open(url);
  } else {
    window.location.href = url;
  }
}

export async function getOIDCEndpoint() {
  try {
    const res = await API.get('/api/oauth/endpoint');
    const { success, message, data } = res.data;
    if (success) {
      return data;
    } else {
      showError(message);
      return '';
    }
  } catch (error) {
    return '';
  }
}

export async function onOIDCAuthClicked(openInNewTab = false) {
  const url = await getOIDCEndpoint();
  if (!url) return;
  if (openInNewTab) {
    window.open(url);
  } else {
    window.location.href = url;
  }
}

export async function onLarkOAuthClicked(lark_client_id) {
  const state = await getOAuthState();
  if (!state) return;
  let redirect_uri = `${window.location.origin}/oauth/lark`;
  window.open(`https://open.feishu.cn/open-apis/authen/v1/authorize?redirect_uri=${redirect_uri}&app_id=${lark_client_id}&state=${state}`);
}

export async function onCZLConnectOAuthClicked(czlconnect_client_id, isBind = false) {
  const state = await getOAuthState();
  if (!state) return;
  let redirect_uri = `${window.location.origin}/oauth/czlconnect`;
  if (isBind) {
    redirect_uri += '/bind';
  }
  window.location.href = `https://connect.czl.net/oauth2/authorize?response_type=code&client_id=${czlconnect_client_id}&redirect_uri=${redirect_uri}&scope=read&state=${state}`;
}

export function useIsAdmin() {
  const { user } = useSelector((state) => state.account);
  if (!user) return false;
  return user.role >= 10;
}

export function timestamp2string(timestamp) {
  let date = new Date(timestamp * 1000);
  let year = date.getFullYear().toString();
  let month = (date.getMonth() + 1).toString();
  let day = date.getDate().toString();
  let hour = date.getHours().toString();
  let minute = date.getMinutes().toString();
  let second = date.getSeconds().toString();
  if (month.length === 1) {
    month = '0' + month;
  }
  if (day.length === 1) {
    day = '0' + day;
  }
  if (hour.length === 1) {
    hour = '0' + hour;
  }
  if (minute.length === 1) {
    minute = '0' + minute;
  }
  if (second.length === 1) {
    second = '0' + second;
  }
  return year + '-' + month + '-' + day + ' ' + hour + ':' + minute + ':' + second;
}

export function calculateQuota(quota, digits = 2) {
  let quotaPerUnit = localStorage.getItem('quota_per_unit');
  quotaPerUnit = parseFloat(quotaPerUnit);

  return (quota / quotaPerUnit).toFixed(digits);
}

export function renderQuota(quota, digits = 2) {
  let displayInCurrency = localStorage.getItem('display_in_currency');
  displayInCurrency = displayInCurrency === 'true';
  if (displayInCurrency) {
    if (quota < 0) {
      return '-$' + calculateQuota(Math.abs(quota), digits);
    }
    return '$' + calculateQuota(quota, digits);
  }
  return renderNumber(quota);
}

export function renderQuotaByMoney(money) {
  money = Number(money);
  let quotaPerUnit = localStorage.getItem('quota_per_unit');
  quotaPerUnit = parseFloat(quotaPerUnit);

  const result = new Decimal(money).mul(quotaPerUnit);

  return result.toFixed(0);
}

export const verifyJSON = (str) => {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
};

export function renderNumber(num) {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1) + 'B';
  } else if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 10000) {
    return (num / 1000).toFixed(1) + 'k';
  } else {
    return num;
  }
}

// 数字千位分隔符
export function thousandsSeparator(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}


export function renderQuotaWithPrompt(quota, digits) {
  let displayInCurrency = localStorage.getItem('display_in_currency');
  displayInCurrency = displayInCurrency === 'true';
  if (displayInCurrency) {
    let quotaPerUnit = localStorage.getItem('quota_per_unit');
    quotaPerUnit = parseFloat(quotaPerUnit);
    let actualQuota = (parseFloat(quota) * quotaPerUnit).toFixed(0);
    return `（等价额度：${renderNumber(actualQuota)}）`;
  }
  return '';
}

export function downloadTextAsFile(text, filename) {
  let blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  let url = URL.createObjectURL(blob);
  let a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
}

export function printElementAsPDF(elementId, filename) {
  const element = document.getElementById(elementId);
  if (!element) {
    showError('Element not found');
    return;
  }

  // Create a new window
  const printWindow = window.open('', '_blank');

  // Get the styles from the current document
  const styles = Array.from(document.styleSheets)
    .map(styleSheet => {
      try {
        return Array.from(styleSheet.cssRules)
          .map(rule => rule.cssText)
          .join('\n');
      } catch (e) {
        // Ignore cross-origin stylesheets
        return '';
      }
    })
    .filter(Boolean)
    .join('\n');

  // Write the HTML content to the new window
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${filename}</title>
        <style>${styles}</style>
      </head>
      <body>
        ${element.outerHTML}
      </body>
    </html>
  `);

  printWindow.document.close();

  // Wait for the content to load before printing
  printWindow.onload = function() {
    printWindow.print();
    // Close the window after printing (optional)
    // printWindow.close();
  };
}

export function removeTrailingSlash(url) {
  if (url.endsWith('/')) {
    return url.slice(0, -1);
  } else {
    return url;
  }
}

export function trims(values) {
  if (typeof values === 'string') {
    return values.trim();
  }

  if (Array.isArray(values)) {
    return values.map((value) => trims(value));
  }

  if (typeof values === 'object') {
    let newValues = {};
    for (let key in values) {
      newValues[key] = trims(values[key]);
    }
    return newValues;
  }

  return values;
}

export function getChatLinks(filterShow = false) {
  let links;
  let siteInfo = JSON.parse(localStorage.getItem('siteInfo'));
  let chatLinks = JSON.parse(siteInfo?.chat_links || '[]');

  if (chatLinks.length === 0) {
    links = CHAT_LINKS;
    if (siteInfo?.chat_link) {
      // 循环找到name为ChatGPT Next的链接
      for (let i = 0; i < links.length; i++) {
        if (links[i].name === 'ChatGPT Next') {
          links[i].url = siteInfo.chat_link + `/#/?settings={"key":"sk-{key}","url":"{server}"}`;
          links[i].show = true;
          break;
        }
      }
    }
  } else {
    links = chatLinks;
  }

  if (filterShow) {
    links = links.filter((link) => link.show);
  }
  // 对links进行排序，sort为空的项排在最后
  links.sort((a, b) => {
    if (!a?.sort) return 1;
    if (!b?.sort) return -1;
    return b.sort - a.sort;
  });
  return links;
}

export function replaceChatPlaceholders(text, key, server) {
  return text.replace('{key}', key).replace('{server}', server);
}

export function ValueFormatter(value, onlyUsd = false, unitMillion = false) {
  if (value == null) {
    return '';
  }
  if (value === 0) {
    return 'Free';
  }

  let decimalValue = new Decimal(value.toString());
  if (unitMillion) {
    decimalValue = decimalValue.mul(1000);
  }

  let usd = decimalValue.mul(0.002).toPrecision(6);

  if (onlyUsd) {
    usd = usd.replace(/(\.\d*?[1-9])0+$|\.0*$/, '$1');

    return `$${usd}`;
  }

  let rmb = decimalValue.mul(0.014).toPrecision(6);

  usd = usd.replace(/(\.\d*?[1-9])0+$|\.0*$/, '$1');
  rmb = rmb.replace(/(\.\d*?[1-9])0+$|\.0*$/, '$1');

  return `$${usd} / ￥${rmb}`;
}
