import { useEffect, useState, type ReactNode } from 'react';
import { getJson } from '../api/client.js';

type Props<T> = {
  path: string;
  title: string;
  description: string;
  emptyMessage: string;
  renderData: (data: T) => ReactNode;
};

export function CapabilityCard<T>({ path, title, description, emptyMessage, renderData }: Props<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setData(null);
    setError(null);
    setLoading(true);
    getJson<T>(path).then((result) => {
      if (active) {
        setData(result);
        setLoading(false);
      }
    }).catch((requestError: unknown) => {
      if (active) {
        setError(requestError instanceof Error ? requestError.message : 'The request failed.');
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [path]);

  const content = data === null ? null : renderData(data);
  const isEmpty = content === null || content === undefined || content === false;

  return <section className="card h-100">
    <div className="card-body">
      <h2 className="h4">{title}</h2>
      <p>{description}</p>
      {loading
        ? <p role="status">Loading {title.toLowerCase()}...</p>
        : error
          ? <p role="alert">Unable to load {title.toLowerCase()}: {error}</p>
          : isEmpty
            ? <p>{emptyMessage}</p>
            : content}
    </div>
  </section>;
}
