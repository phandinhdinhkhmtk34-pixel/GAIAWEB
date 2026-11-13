/** Plain text → headings ("## "), table rows ("| a | b |") and paragraphs. No HTML is ever interpreted. */
export function renderLegal(text: string, opts: { nested?: boolean } = {}) {
  const out: React.ReactNode[] = [];
  let rows: string[][] = [];
  let para: string[] = [];
  const flushRows = () => {
    if (!rows.length) return;
    out.push(
      <div key={`t${out.length}`} className="my-6 overflow-x-auto">
        <table className="w-full min-w-[480px] border-collapse text-sm">
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-navy-900/10">
                <th scope="row" className="w-48 bg-sky-50 px-4 py-3 text-left align-top font-semibold">{r[0]}</th>
                <td className="px-4 py-3 align-top whitespace-pre-line">{r.slice(1).join(" ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>,
    );
    rows = [];
  };
  const flushPara = () => {
    if (!para.length) return;
    out.push(<p key={`p${out.length}`} className="my-4 leading-relaxed whitespace-pre-line">{para.join("\n")}</p>);
    para = [];
  };
  for (const line of text.split("\n")) {
    const l = line.trimEnd();
    if (l.startsWith("|")) {
      flushPara();
      rows.push(l.replace(/^\||\|$/g, "").split("|").map((c) => c.trim()));
    } else if (l.startsWith("## ")) {
      flushRows();
      flushPara();
      const first = !out.some((n) => (n as { props?: { "data-top"?: boolean } })?.props?.["data-top"]);
      // Inside another document (a contract's appendix) the headings sit two levels lower.
      const [Top, Sub] = opts.nested ? (["h3", "h4"] as const) : (["h1", "h2"] as const);
      out.push(
        first ? (
          <Top key={`h${out.length}`} data-top className={opts.nested ? "mb-4 font-serif text-xl font-bold" : "mb-6 font-serif text-2xl font-bold sm:text-3xl"}>{l.slice(3)}</Top>
        ) : (
          <Sub key={`h${out.length}`} className={opts.nested ? "mt-6 mb-2 font-bold" : "mt-10 mb-3 font-serif text-xl font-bold"}>{l.slice(3)}</Sub>
        ),
      );
    } else if (!l.trim()) {
      flushRows();
      flushPara();
    } else {
      flushRows();
      para.push(l);
    }
  }
  flushRows();
  flushPara();
  return out;
}

