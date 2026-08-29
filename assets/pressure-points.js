(() => {
  const renderPressureGroups = () => {
    const section = document.querySelector('#conflicts');
    const table = section?.querySelector('table');
    if (!table || section.querySelector('.pressure-groups')) return;

    const rows = [...table.tBodies[0].rows];
    const groups = document.createElement('div');
    groups.className = 'pressure-groups';

    if (rows.length === 1 && rows[0].cells.length === 1) {
      const empty = document.createElement('p');
      empty.className = 'empty-state';
      empty.textContent = rows[0].textContent.trim();
      groups.append(empty);
    } else {
      rows.forEach(row => {
        const date = row.cells[0].textContent.trim();
        const activities = row.cells[1].innerHTML.split(/<br\s*\/?\s*>/i);
        const group = document.createElement('div');
        group.className = 'pressure-group';

        const dateHeader = document.createElement('div');
        dateHeader.className = 'pressure-date';
        dateHeader.textContent = date;

        const activityBlock = document.createElement('div');
        activityBlock.className = 'pressure-activities';
        activities.forEach(activity => {
          const line = document.createElement('div');
          line.className = 'pressure-activity';
          line.innerHTML = activity;
          activityBlock.append(line);
        });

        group.append(dateHeader, activityBlock);
        groups.append(group);
      });
    }

    section.querySelector('.table-wrap').replaceWith(groups);
  };

  const observer = new MutationObserver(renderPressureGroups);
  observer.observe(document.querySelector('#schedule-app'), {childList: true, subtree: true});
  renderPressureGroups();
})();
