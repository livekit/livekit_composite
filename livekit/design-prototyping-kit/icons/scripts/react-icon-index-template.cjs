const path = require('path');

function indexTemplate(files) {
  const exportEntries = files.map(({ path: file }) => {
    const basename = path.basename(file, path.extname(file));
    return `export { default as ${basename} } from './${basename}';`;
  });

  return exportEntries.join('\n');
}

module.exports = indexTemplate;




// const path = require('path');

// const BASE_DIR = '../bytes-core/icons/svgs';
// const SUB_DIRS = ['central-line', 'central-solid', 'custom', 'integration-logos'];

// /*
//  * NOTE:
//  * This dictionary maps icon component names to any additional aliases they should be
//  * exported under. Name collisions are not allowed between icons of any subdirectory.
//  */
// const ALIASES = {
//   ArrowOutOfBoxIcon: ['EgressIcon', 'NavEgresses'],
//   ArrowUpRightIcon: ['ExternalLinkIcon'],
//   BarsThreeIcon: ['HamburgerIcon'],
//   BookIcon: ['NavDocumentation'],
//   Chart5Icon: ['NavAnalytics'],
//   Chart5SolidIcon: ['NavAnalyticsFilled'],
//   Checkmark2SmallIcon: ['CheckIcon'],
//   ChevronDownSmallIcon: ['ChevronIcon'],
//   CircleInfoIcon: ['InfoIcon'],
//   CircleXSolidIcon: ['CloseCircleIcon'],
//   CreditCard2Icon: ['NavBilling'],
//   CreditCard2SolidIcon: ['NavBillingFilled'],
//   CrossLargeIcon: ['CloseIcon'],
//   Filter2Icon: ['FilterIcon'],
//   MagnifyingGlassIcon: ['SearchIcon'],
//   RescueRingIcon: ['NavSupportIcon'],
//   RobotIcon: ['NavAgents', 'AgentsIcon'],
//   RobotSolidIcon: ['AgentsSolidIcon', 'NavAgentsFilled'],
//   SearchMenuIcon: ['NavSearch'],
//   SettingsGear2Icon: ['NavSettings'],
//   SettingsGear2SolidIcon: ['NavSettingsFilled'],
//   SquareArrowInTopLeftIcon: ['IngressIcon', 'NavIngresses'],
//   SquareBehindSquare1Icon: ['CopyIcon'],
//   SquareGridMaginfyingGlassIcon: ['NavSessions'],
//   SquareGridMaginfyingGlassSolidIcon: ['NavSessionsFilled'],
//   SquarePlaceholderDashedIcon: ['NavSandboxIcon'],
//   SquarePlaceholderDashedSolidIcon: ['NavSandboxFilledIcon'],
//   TelephoneIcon: ['SipIcon'],
//   TelephoneSolidIcon: ['SipSolidIcon'],
// };

// function indexTemplate(files) {
//   const exportEntries = files.map(({ path: file }) => {
//     const basename = path.basename(file, path.extname(file));
//     const aliases = (ALIASES[basename] || []).map((a) => `default as ${a}`).join(', ');
//     return `export { default as ${basename}${aliases ? `, ${aliases}` : ''} } from './${basename}';`;
//   });

//   const assetDir = path.dirname(files[0].originalPath);
//   if (assetDir === BASE_DIR) {
//     for (const dir of SUB_DIRS) {
//       exportEntries.unshift(`export * from './${dir}';`);
//     }
//   }

//   return exportEntries.join('\n');
// }

// module.exports = indexTemplate;
