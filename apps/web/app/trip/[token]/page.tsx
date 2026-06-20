import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { supabase } from '@/lib/supabase';

interface PageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;

  const { data: trip } = await supabase
    .from('trips')
    .select('destination, start_date, end_date')
    .eq('share_token', token)
    .single();

  if (!trip) return { title: 'Trip Itinerary — Huddle' };

  return {
    title: `${trip.destination} Itinerary — Huddle`,
    description: `Trip to ${trip.destination} from ${trip.start_date} to ${trip.end_date}. Made with Huddle.`,
  };
}

export default async function TripSharePage({ params }: PageProps) {
  const { token } = await params;

  // Fetch trip by share token (would need a share_token column in trips table)
  const { data: trip, error } = await supabase
    .from('trips')
    .select(`
      *,
      plan:plans(title, creator:users!creator_id(name)),
      itinerary:itinerary_items(*)
    `)
    .eq('share_token', token as any)
    .single();

  if (error || !trip) notFound();

  const itineraryByDay = (trip.itinerary as any[]).reduce(
    (acc: Record<number, any[]>, item: any) => {
      if (!acc[item.day]) acc[item.day] = [];
      if (item.status !== 'vetoed') acc[item.day].push(item);
      return acc;
    },
    {}
  );

  const creator = (trip.plan as any)?.creator;
  const planTitle = (trip.plan as any)?.title ?? `Trip to ${trip.destination}`;

  return (
    <main className="min-h-screen bg-gray-950">
      {/* Hero */}
      <div
        className="px-5 pt-14 pb-8 text-center"
        style={{ background: 'linear-gradient(180deg, #0F2027 0%, #203A43 100%)' }}
      >
        <div className="text-5xl mb-3">✈️</div>
        <h1 className="text-white text-3xl font-bold mb-2">{trip.destination}</h1>
        <p className="text-white/60 text-base">
          {new Date(trip.start_date).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
          })}
          {' — '}
          {new Date(trip.end_date).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>
        {creator && (
          <p className="text-white/40 text-sm mt-2">
            Planned by {creator.name} with Huddle 🤝
          </p>
        )}
      </div>

      {/* Itinerary */}
      <div className="px-5 py-8 max-w-lg mx-auto">
        {Object.entries(itineraryByDay).map(([day, items]) => {
          const dayDate = new Date(trip.start_date);
          dayDate.setDate(dayDate.getDate() + parseInt(day) - 1);
          const dayLabel = dayDate.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          });

          const TYPE_EMOJI: Record<string, string> = {
            stay: '🏨',
            activity: '🎯',
            food: '🍽️',
            transport: '✈️',
          };

          return (
            <div key={day} className="mb-8">
              <h2 className="text-white font-bold text-xl mb-4">
                Day {day} · {dayLabel}
              </h2>

              <div className="flex flex-col gap-3">
                {(items as any[]).map((item, i) => {
                  const payload = item.payload;
                  return (
                    <div
                      key={i}
                      className="rounded-2xl p-4"
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.05)',
                        border: item.status === 'confirmed'
                          ? '1px solid rgba(34,197,94,0.3)'
                          : '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl flex-shrink-0 mt-0.5">
                          {TYPE_EMOJI[payload.type] ?? '📍'}
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <p className="text-white font-bold">{payload.title}</p>
                            {payload.time && (
                              <p className="text-white/40 text-sm flex-shrink-0">{payload.time}</p>
                            )}
                          </div>
                          {payload.description && (
                            <p className="text-white/60 text-sm leading-relaxed mb-2">
                              {payload.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3">
                            {payload.estimated_cost > 0 && (
                              <span className="text-green-400 text-xs font-semibold">
                                ~${payload.estimated_cost}/person
                              </span>
                            )}
                            {item.status === 'confirmed' && (
                              <span className="text-green-400 text-xs font-bold">✓ Confirmed</span>
                            )}
                          </div>
                          {payload.notes && (
                            <p className="text-white/40 text-xs mt-2 italic">💡 {payload.notes}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Made with Huddle growth artifact */}
      <div
        className="mx-5 mb-8 rounded-2xl px-5 py-5 text-center max-w-lg"
        style={{
          background: 'linear-gradient(135deg, #667EEA20, #764BA220)',
          border: '1px solid rgba(102,126,234,0.2)',
        }}
      >
        <p className="text-2xl mb-2">🤝</p>
        <p className="text-white font-bold mb-1">Made with Huddle</p>
        <p className="text-white/50 text-sm mb-4">
          Plan your next group trip with Huddle — the app that turns "we should go somewhere"
          into an actual trip.
        </p>
        <a
          href={process.env.NEXT_PUBLIC_IOS_URL ?? '#'}
          className="inline-block text-white font-bold text-sm px-5 py-2.5 rounded-xl"
          style={{ background: 'linear-gradient(135deg, #667EEA, #764BA2)' }}
        >
          Download Free
        </a>
      </div>
    </main>
  );
}
