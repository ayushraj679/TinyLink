import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { useMyLinks } from '../hooks/useMyLinks'
import { useShortenUrl } from '../hooks/useShortenUrl'
import type { ShortenResponse } from '../api/types'

const urlRegex =
  /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?(\?.*)?$/i

const shortenFormSchema = z.object({
  originalUrl: z
    .string()
    .trim()
    .min(1, 'Please enter a URL')
    .regex(urlRegex, 'Enter a valid URL'),
  customAlias: z
    .string()
    .trim()
    .max(20, 'Alias must be 20 characters or fewer')
    .regex(/^[a-zA-Z0-9]*$/, 'Alias can only contain letters and numbers')
    .optional(),
  expiresAt: z
    .string()
    .optional()
    .refine((value) => {
      if (!value) {
        return true
      }

      const parsed = new Date(value)
      return !Number.isNaN(parsed.getTime()) && parsed.getTime() > Date.now()
    }, 'Expiry must be a future date and time'),
})

type ShortenFormValues = z.infer<typeof shortenFormSchema>

export interface ShortenFormProps {
  onSuccess: (result: Pick<ShortenResponse, 'shortCode' | 'shortUrl'>) => void
}

function normalizeOriginalUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`
}

function toLocalDateTime(value: string): string {
  return value.length === 16 ? `${value}:00` : value
}

export default function ShortenForm({ onSuccess }: ShortenFormProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const { mutateAsync, isPending, error, reset } = useShortenUrl()
  const { addLink } = useMyLinks()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ShortenFormValues>({
    resolver: zodResolver(shortenFormSchema),
    defaultValues: {
      originalUrl: '',
      customAlias: '',
      expiresAt: '',
    },
  })

  const onSubmit = async (values: ShortenFormValues) => {
    reset()

    const result = await mutateAsync({
      originalUrl: normalizeOriginalUrl(values.originalUrl),
      ...(values.customAlias ? { customAlias: values.customAlias } : {}),
      ...(values.expiresAt
        ? { expiresAt: toLocalDateTime(values.expiresAt) }
        : {}),
    })

    addLink({
      shortCode: result.shortCode,
      createdAt: new Date().toISOString(),
    })

    onSuccess({
      shortCode: result.shortCode,
      shortUrl: result.shortUrl,
    })
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="w-full rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8"
      noValidate
    >
      <div className="space-y-2">
        <label htmlFor="originalUrl" className="sr-only">
          URL to shorten
        </label>
        <input
          id="originalUrl"
          type="text"
          inputMode="url"
          autoComplete="url"
          placeholder="Paste a long URL"
          aria-invalid={errors.originalUrl ? true : undefined}
          aria-describedby={errors.originalUrl ? 'originalUrl-error' : undefined}
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 text-base text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
          {...register('originalUrl')}
        />
        {errors.originalUrl ? (
          <p id="originalUrl-error" className="text-sm text-red-600">
            {errors.originalUrl.message}
          </p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => setShowAdvanced((open) => !open)}
        className="mt-5 flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-gray-900"
        aria-expanded={showAdvanced}
      >
        <svg
          className={`size-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M7.22 4.22a.75.75 0 0 1 1.06 0l5.25 5.25a.75.75 0 0 1 0 1.06l-5.25 5.25a.75.75 0 1 1-1.06-1.06L11.94 10 7.22 5.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
        Advanced Options
      </button>

      {showAdvanced ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label
              htmlFor="customAlias"
              className="block text-sm font-medium text-gray-700"
            >
              Custom alias
            </label>
            <input
              id="customAlias"
              type="text"
              maxLength={20}
              placeholder="mylink"
              aria-invalid={errors.customAlias ? true : undefined}
              aria-describedby={
                errors.customAlias ? 'customAlias-error' : undefined
              }
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
              {...register('customAlias')}
            />
            {errors.customAlias ? (
              <p id="customAlias-error" className="text-sm text-red-600">
                {errors.customAlias.message}
              </p>
            ) : (
              <p className="text-xs text-gray-400">
                Optional. Letters and numbers, up to 20 characters.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="expiresAt"
              className="block text-sm font-medium text-gray-700"
            >
              Expires at
            </label>
            <input
              id="expiresAt"
              type="datetime-local"
              aria-invalid={errors.expiresAt ? true : undefined}
              aria-describedby={errors.expiresAt ? 'expiresAt-error' : undefined}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
              {...register('expiresAt')}
            />
            {errors.expiresAt ? (
              <p id="expiresAt-error" className="text-sm text-red-600">
                {errors.expiresAt.message}
              </p>
            ) : (
              <p className="text-xs text-gray-400">
                Optional. Must be a future date and time.
              </p>
            )}
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? (
          <>
            <svg
              className="size-5 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
            Shortening…
          </>
        ) : (
          'Shorten URL'
        )}
      </button>
    </form>
  )
}
