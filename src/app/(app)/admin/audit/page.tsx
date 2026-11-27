// Same page as /audit, reached from inside the admin section so its top nav
// (Staff, Activity Log, Sales Report) stays visible — /audit itself has to
// stay outside /admin since non-admin accounts can open it too.
export { default } from "../../audit/page";
