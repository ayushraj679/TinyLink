import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useMyLinks } from "../hooks/useMyLinks";
import { useUrlStats } from "../hooks/useUrlStats";
import { useDeleteUrl } from "../hooks/useDeleteUrl";

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

type DateInput = string | number | Date;

/**
 * Public base URL of your short links. Set VITE_SHORT_URL_BASE in production
 * (for example https://tiny.example.com). It falls back to the current origin,
 * which works in dev when Vite proxies /api to the backend.
 */
const SHORT_URL_BASE = ((import.meta.env.VITE_SHORT_URL_BASE as string | undefined) ?? window.location.origin).replace(
  /\/+$/,
  "",
);

const buildShortUrl = (shortCode: string) => `${SHORT_URL_BASE}/api/${encodeURIComponent(shortCode)}`;
const stripProtocol = (url: string) => url.replace(/^https?:\/\//i, "");

const numberFormat = new Intl.NumberFormat();
const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

function formatCreated(value?: DateInput): string | null {
  if (value === undefined) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : dateFormat.format(date);
}

function toTime(value: DateInput): number {
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function getErrorStatus(error: unknown): number | undefined {
  if (typeof error === "object" && error !== null && "status" in error) {
    const { status } = error as { status: unknown };
    return typeof status === "number" ? status : undefined;
  }
  return undefined;
}

/**
 * Copies text to the clipboard. navigator.clipboard only exists in secure
 * contexts (https or localhost), so fall back to a hidden textarea otherwise.
 */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Permission denied or document not focused: try the fallback below.
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(textarea);
    return copied;
  } catch {
    return false;
  }
}

type CopyState = "idle" | "copied" | "failed";

function useCopy(text: string) {
  const [state, setState] = useState<CopyState>("idle");
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = useCallback(async () => {
    const copied = await copyText(text);
    setState(copied ? "copied" : "failed");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState("idle"), 2000);
  }, [text]);

  return { state, copy };
}

/* -------------------------------------------------------------------------- */
/*  Shared styles and tiny pieces                                             */
/* -------------------------------------------------------------------------- */

// Header and rows share one column template so they line up from md upwards.
// Below md every row stacks into a card-like block instead.
const COLUMNS = "md:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)_4.5rem_14rem]";
const ROW = `grid grid-cols-2 items-center gap-x-4 gap-y-3 px-5 py-4 hover:bg-slate-50/60 ${COLUMNS}`;

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700";
const buttonBase = `inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`;
const secondaryButton = `${buttonBase} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`;
const dangerOutlineButton = `${secondaryButton} hover:border-red-300 hover:bg-red-50 hover:text-red-700`;
const dangerButton = `${buttonBase} bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-600`;

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      className="size-4 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const CopyIcon = () => (
  <Icon>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V6a2 2 0 0 1 2-2h9" />
  </Icon>
);

const CheckIcon = () => (
  <Icon>
    <path d="M5 12.5 9.5 17 19 7.5" />
  </Icon>
);

const TrashIcon = () => (
  <Icon>
    <path d="M4 7h16" />
    <path d="M10 11v6M14 11v6" />
    <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
    <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </Icon>
);

const AlertIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v5M12 16.5h.01" />
  </Icon>
);

function Bar({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-md bg-slate-200 motion-reduce:animate-none ${className}`} />;
}

/* -------------------------------------------------------------------------- */
/*  LinkRow                                                                   */
/* -------------------------------------------------------------------------- */

interface LinkRowProps {
  shortCode: string;
  createdAt?: DateInput;
}

function LinkRow({ shortCode, createdAt }: LinkRowProps) {
  const stats = useUrlStats(shortCode);
  const remove = useDeleteUrl();

  const shortUrl = buildShortUrl(shortCode);
  const created = formatCreated(createdAt);
  const { state: copyState, copy } = useCopy(shortUrl);

  // Inline two-step delete, with focus moved to "Cancel" and back to "Delete".
  const [confirming, setConfirming] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const deleteRef = useRef<HTMLButtonElement>(null);
  const wasConfirming = useRef(false);

  useEffect(() => {
    if (confirming) cancelRef.current?.focus();
    else if (wasConfirming.current) deleteRef.current?.focus();
    wasConfirming.current = confirming;
  }, [confirming]);

  // The first cell is identical in every state except for the expired one.
  const shortLinkCell = (
    <div role="cell" className="col-span-2 min-w-0 md:col-span-1">
      {stats.isError ? (
        <p className="truncate font-medium text-slate-400 line-through">{stripProtocol(shortUrl)}</p>
      ) : (
        <a
          href={shortUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`block truncate rounded-sm font-medium text-teal-800 underline-offset-4 hover:underline ${focusRing}`}
        >
          {stripProtocol(shortUrl)}
        </a>
      )}
      {created && <p className="mt-0.5 text-sm text-slate-500">Created {created}</p>}
    </div>
  );

  /* ---- Loading: skeleton ------------------------------------------------- */
  if (stats.isPending) {
    return (
      <div role="row" aria-busy="true" className={ROW}>
        {shortLinkCell}
        <div role="cell" className="col-span-2 md:col-span-1">
          <Bar className="h-4 w-4/5" />
          <span className="sr-only">Loading details for {shortCode}</span>
        </div>
        <div role="cell" className="flex md:justify-end">
          <Bar className="h-5 w-10" />
        </div>
        <div role="cell" className="flex justify-end gap-2">
          <Bar className="h-9 w-20" />
          <Bar className="h-9 w-20" />
        </div>
      </div>
    );
  }

  /* ---- Expired, deleted or failed to load -------------------------------- */
  if (stats.isError) {
    const gone = getErrorStatus(stats.error) === 404 || getErrorStatus(stats.error) === 410;

    return (
      <div role="row" className={ROW}>
        {shortLinkCell}

        <div role="cell" className="col-span-2 flex min-w-0 items-start gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-700">
            <AlertIcon />
          </span>
          <div className="min-w-0">
            <p className="font-medium text-slate-900">Link expired or deleted</p>
            <p className="mt-0.5 text-sm text-slate-600">
              {gone
                ? "This link no longer works. You can remove it from your list."
                : "We couldn't load this link. It may be expired or deleted, or the server may be unreachable."}
            </p>
          </div>
        </div>

        <div role="cell" className="col-span-2 flex flex-col items-end gap-1.5 md:col-span-1">
          <div className="flex gap-2">
            {!gone && (
              <button
                type="button"
                onClick={() => void stats.refetch()}
                disabled={stats.isFetching}
                className={secondaryButton}
              >
                {stats.isFetching ? "Retrying…" : "Retry"}
              </button>
            )}
            <button
              type="button"
              onClick={() => remove.mutate(shortCode)}
              disabled={remove.isPending}
              className={dangerOutlineButton}
            >
              <TrashIcon />
              {remove.isPending ? "Removing…" : "Remove from list"}
            </button>
          </div>
          {remove.isError && (
            <p role="alert" className="text-xs text-red-700">
              Couldn't remove this link. Try again.
            </p>
          )}
        </div>
      </div>
    );
  }

  /* ---- Loaded ------------------------------------------------------------ */
  const { originalUrl, clickCount } = stats.data;

  return (
    <div role="row" className={ROW}>
      {shortLinkCell}

      <div role="cell" className="col-span-2 min-w-0 md:col-span-1">
        <a
          href={originalUrl}
          target="_blank"
          rel="noopener noreferrer"
          title={originalUrl}
          className={`block truncate rounded-sm text-slate-700 underline-offset-4 hover:text-teal-800 hover:underline ${focusRing}`}
        >
          {stripProtocol(originalUrl)}
        </a>
      </div>

      <div role="cell" className="flex items-baseline gap-1.5 md:justify-end">
        <span className="text-sm text-slate-500 md:hidden">Clicks</span>
        <span className="text-lg font-semibold text-slate-900 tabular-nums">{numberFormat.format(clickCount)}</span>
      </div>

      <div role="cell" className="flex flex-col items-end gap-1.5">
        {confirming ? (
          <>
            <p className="text-xs text-slate-500">Delete this link?</p>
            <div className="flex gap-2">
              <button
                ref={cancelRef}
                type="button"
                onClick={() => setConfirming(false)}
                disabled={remove.isPending}
                className={secondaryButton}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => remove.mutate(shortCode)}
                disabled={remove.isPending}
                className={dangerButton}
              >
                {remove.isPending ? "Deleting…" : "Yes, delete"}
              </button>
            </div>
          </>
        ) : (
          <div className="flex gap-2">
            <button type="button" onClick={() => void copy()} className={secondaryButton}>
              {copyState === "copied" ? <CheckIcon /> : <CopyIcon />}
              {copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : "Copy"}
            </button>
            <button ref={deleteRef} type="button" onClick={() => setConfirming(true)} className={dangerOutlineButton}>
              <TrashIcon />
              Delete
            </button>
          </div>
        )}

        {remove.isError && (
          <p role="alert" className="text-xs text-red-700">
            Couldn't delete this link. Try again.
          </p>
        )}
        <span role="status" className="sr-only">
          {copyState === "copied" ? "Link copied to clipboard" : ""}
        </span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  LinksPage                                                                 */
/* -------------------------------------------------------------------------- */

export default function LinksPage() {
  const { links } = useMyLinks();

  // Newest first.
  const sorted = useMemo(() => [...links].sort((a, b) => toTime(b.createdAt) - toTime(a.createdAt)), [links]);

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900">
      <main className="mx-auto w-full max-w-5xl px-5 pt-12 pb-24 sm:pt-20">
        <header className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Your links</h1>
            <p className="mt-2 text-slate-600">
              {links.length === 0
                ? "Links you create in this browser will show up here."
                : `${links.length} ${links.length === 1 ? "link" : "links"} saved in this browser, with live click counts.`}
            </p>
          </div>
          <Link
            to="/"
            className={`inline-flex h-11 items-center justify-center rounded-xl bg-teal-700 px-5 text-base font-semibold text-white hover:bg-teal-800 ${focusRing}`}
          >
            Shorten a link
          </Link>
        </header>

        {sorted.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <h2 className="text-lg font-semibold">No links yet</h2>
            <p className="mx-auto mt-2 max-w-sm text-slate-600">
              Shorten a link and it will appear here so you can copy it, check its clicks, or delete it.
            </p>
            <Link
              to="/"
              className={`mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-teal-700 px-5 text-base font-semibold text-white hover:bg-teal-800 ${focusRing}`}
            >
              Shorten your first link
            </Link>
          </div>
        ) : (
          <div
            role="table"
            aria-label="Your short links"
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs"
          >
            <div role="rowgroup">
              <div
                role="row"
                className={`hidden gap-x-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-sm font-medium text-slate-500 md:grid ${COLUMNS}`}
              >
                <div role="columnheader">Short link</div>
                <div role="columnheader">Original link</div>
                <div role="columnheader" className="text-right">
                  Clicks
                </div>
                <div role="columnheader" className="text-right">
                  <span className="sr-only">Actions</span>
                </div>
              </div>
            </div>

            <div role="rowgroup" className="divide-y divide-slate-100">
              {sorted.map((link) => (
                <LinkRow key={link.shortCode} shortCode={link.shortCode} createdAt={link.createdAt} />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}