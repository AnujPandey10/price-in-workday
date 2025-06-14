// popup.js
const salaryInput = document.getElementById('salary');
const saveBtn     = document.getElementById('save');
const statusText  = document.getElementById('status');

// Load saved salary on open
chrome.storage.sync.get(['monthlySalary'], ({ monthlySalary }) => {
  if (monthlySalary) salaryInput.value = monthlySalary;
});

// Save salary when user clicks
saveBtn.addEventListener('click', () => {
  const val = Number(salaryInput.value);
  if (val > 0) {
    chrome.storage.sync.set({ monthlySalary: val }, () => {
      statusText.textContent = 'Saved!';
      setTimeout(() => statusText.textContent = '', 1500);
    });
  } else {
    statusText.textContent = 'Enter a valid number';
    statusText.style.color = 'red';
  }
});
