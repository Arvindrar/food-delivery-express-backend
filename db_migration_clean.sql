--
-- PostgreSQL database dump
--

\restrict vheeAQrXaqzEZXZtcU00M2rDAzW6IdamnqF0U7mvIc3TVQxYXq5NlcKiMN5Vvmr

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_referred_by_fkey;
ALTER TABLE IF EXISTS ONLY public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.reviews DROP CONSTRAINT IF EXISTS reviews_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.reviews DROP CONSTRAINT IF EXISTS reviews_restaurant_id_fkey;
ALTER TABLE IF EXISTS ONLY public.reviews DROP CONSTRAINT IF EXISTS reviews_order_id_fkey;
ALTER TABLE IF EXISTS ONLY public.orders DROP CONSTRAINT IF EXISTS orders_restaurant_id_fkey;
ALTER TABLE IF EXISTS ONLY public.orders DROP CONSTRAINT IF EXISTS orders_driver_id_fkey;
ALTER TABLE IF EXISTS ONLY public.order_items DROP CONSTRAINT IF EXISTS order_items_order_id_fkey;
ALTER TABLE IF EXISTS ONLY public.order_items DROP CONSTRAINT IF EXISTS order_items_menu_item_id_fkey;
ALTER TABLE IF EXISTS ONLY public.messages DROP CONSTRAINT IF EXISTS messages_order_id_fkey;
ALTER TABLE IF EXISTS ONLY public.menu_items DROP CONSTRAINT IF EXISTS menu_items_restaurant_id_fkey;
ALTER TABLE IF EXISTS ONLY public.menu_items DROP CONSTRAINT IF EXISTS menu_items_category_id_fkey;
ALTER TABLE IF EXISTS ONLY public.favorites DROP CONSTRAINT IF EXISTS favorites_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.favorites DROP CONSTRAINT IF EXISTS favorites_restaurant_id_fkey;
ALTER TABLE IF EXISTS ONLY public.addresses DROP CONSTRAINT IF EXISTS addresses_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_referral_code_key;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_phone_key;
ALTER TABLE IF EXISTS ONLY public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_pkey;
ALTER TABLE IF EXISTS ONLY public.reviews DROP CONSTRAINT IF EXISTS reviews_pkey;
ALTER TABLE IF EXISTS ONLY public.reviews DROP CONSTRAINT IF EXISTS reviews_order_id_key;
ALTER TABLE IF EXISTS ONLY public.restaurants DROP CONSTRAINT IF EXISTS restaurants_pkey;
ALTER TABLE IF EXISTS ONLY public.restaurants DROP CONSTRAINT IF EXISTS restaurants_login_id_key;
ALTER TABLE IF EXISTS ONLY public.payout_requests DROP CONSTRAINT IF EXISTS payout_requests_pkey;
ALTER TABLE IF EXISTS ONLY public.orders DROP CONSTRAINT IF EXISTS orders_pkey;
ALTER TABLE IF EXISTS ONLY public.order_items DROP CONSTRAINT IF EXISTS order_items_pkey;
ALTER TABLE IF EXISTS ONLY public.messages DROP CONSTRAINT IF EXISTS messages_pkey;
ALTER TABLE IF EXISTS ONLY public.menu_items DROP CONSTRAINT IF EXISTS menu_items_pkey;
ALTER TABLE IF EXISTS ONLY public.favorites DROP CONSTRAINT IF EXISTS favorites_pkey;
ALTER TABLE IF EXISTS ONLY public.drivers DROP CONSTRAINT IF EXISTS drivers_pkey;
ALTER TABLE IF EXISTS ONLY public.drivers DROP CONSTRAINT IF EXISTS drivers_phone_key;
ALTER TABLE IF EXISTS ONLY public.categories DROP CONSTRAINT IF EXISTS categories_pkey;
ALTER TABLE IF EXISTS ONLY public.admins DROP CONSTRAINT IF EXISTS admins_pkey;
ALTER TABLE IF EXISTS ONLY public.admins DROP CONSTRAINT IF EXISTS admins_phone_key;
ALTER TABLE IF EXISTS ONLY public.addresses DROP CONSTRAINT IF EXISTS addresses_pkey;
ALTER TABLE IF EXISTS public.users ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.subscriptions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.reviews ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.restaurants ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.payout_requests ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.orders ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.order_items ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.messages ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.menu_items ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.drivers ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.categories ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.admins ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.addresses ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE IF EXISTS public.users_id_seq;
DROP TABLE IF EXISTS public.users;
DROP SEQUENCE IF EXISTS public.subscriptions_id_seq;
DROP TABLE IF EXISTS public.subscriptions;
DROP SEQUENCE IF EXISTS public.reviews_id_seq;
DROP TABLE IF EXISTS public.reviews;
DROP SEQUENCE IF EXISTS public.restaurants_id_seq;
DROP TABLE IF EXISTS public.restaurants;
DROP SEQUENCE IF EXISTS public.payout_requests_id_seq;
DROP TABLE IF EXISTS public.payout_requests;
DROP SEQUENCE IF EXISTS public.orders_id_seq;
DROP TABLE IF EXISTS public.orders;
DROP SEQUENCE IF EXISTS public.order_items_id_seq;
DROP TABLE IF EXISTS public.order_items;
DROP SEQUENCE IF EXISTS public.messages_id_seq;
DROP TABLE IF EXISTS public.messages;
DROP SEQUENCE IF EXISTS public.menu_items_id_seq;
DROP TABLE IF EXISTS public.menu_items;
DROP TABLE IF EXISTS public.favorites;
DROP SEQUENCE IF EXISTS public.drivers_id_seq;
DROP TABLE IF EXISTS public.drivers;
DROP SEQUENCE IF EXISTS public.categories_id_seq;
DROP TABLE IF EXISTS public.categories;
DROP SEQUENCE IF EXISTS public.admins_id_seq;
DROP TABLE IF EXISTS public.admins;
DROP SEQUENCE IF EXISTS public.addresses_id_seq;
DROP TABLE IF EXISTS public.addresses;
DROP EXTENSION IF EXISTS pg_trgm;
--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: addresses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.addresses (
    id integer NOT NULL,
    user_id integer,
    label character varying(50) NOT NULL,
    address_text text NOT NULL,
    is_default boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    latitude character varying,
    longitude character varying,
    landmark character varying
);


--
-- Name: addresses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.addresses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: addresses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.addresses_id_seq OWNED BY public.addresses.id;


--
-- Name: admins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admins (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    phone character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: admins_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.admins_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: admins_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.admins_id_seq OWNED BY public.admins.id;


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    image_url text,
    veg_type character varying(20) DEFAULT 'both'::character varying
);


--
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;


--
-- Name: drivers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.drivers (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    phone character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    password_plain character varying(255),
    is_online boolean DEFAULT false,
    latitude character varying(255),
    longitude character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    wallet_balance numeric(10,2) DEFAULT 0.00
);


--
-- Name: drivers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.drivers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: drivers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.drivers_id_seq OWNED BY public.drivers.id;


--
-- Name: favorites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.favorites (
    user_id integer NOT NULL,
    restaurant_id integer NOT NULL
);


--
-- Name: menu_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.menu_items (
    id integer NOT NULL,
    restaurant_id integer,
    category_id integer,
    name character varying(100) NOT NULL,
    description text,
    price integer NOT NULL,
    is_veg boolean DEFAULT true,
    image_url text,
    is_available boolean DEFAULT true
);


--
-- Name: menu_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.menu_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: menu_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.menu_items_id_seq OWNED BY public.menu_items.id;


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id integer NOT NULL,
    order_id integer,
    sender_type character varying(20) NOT NULL,
    sender_id integer NOT NULL,
    message text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.messages_id_seq OWNED BY public.messages.id;


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    id integer NOT NULL,
    order_id integer,
    menu_item_id integer,
    quantity integer NOT NULL,
    price integer NOT NULL
);


--
-- Name: order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.order_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: order_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.order_items_id_seq OWNED BY public.order_items.id;


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id integer NOT NULL,
    user_id integer,
    restaurant_id integer,
    total_amount integer NOT NULL,
    status character varying(20) DEFAULT 'Pending'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    driver_id integer,
    driver_earnings integer DEFAULT 0,
    delivery_address text,
    customer_name character varying(100),
    latitude character varying,
    longitude character varying,
    landmark character varying,
    is_driver_accepted boolean DEFAULT false,
    distance numeric(10,2) DEFAULT 0,
    delivery_fee integer DEFAULT 0,
    handling_fee integer DEFAULT 0,
    platform_commission integer DEFAULT 0,
    payment_method character varying(50) DEFAULT 'COD'::character varying,
    payment_id character varying(255),
    rejected_by integer[] DEFAULT '{}'::integer[],
    secondary_contact_name character varying(255),
    secondary_contact_phone character varying(20)
);


--
-- Name: orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.orders_id_seq OWNED BY public.orders.id;


--
-- Name: payout_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payout_requests (
    id integer NOT NULL,
    user_type character varying(20) NOT NULL,
    user_id integer NOT NULL,
    amount numeric(10,2) NOT NULL,
    status character varying(20) DEFAULT 'Pending'::character varying,
    requested_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    processed_at timestamp without time zone
);


--
-- Name: payout_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payout_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payout_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payout_requests_id_seq OWNED BY public.payout_requests.id;


--
-- Name: restaurants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.restaurants (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    image_url text,
    rating numeric(2,1),
    delivery_time character varying(20),
    is_veg_only boolean DEFAULT false,
    cost_for_two integer,
    password character varying(255),
    cuisines text,
    address text,
    latitude character varying,
    longitude character varying,
    login_id character varying(100),
    password_plain character varying(255),
    is_active boolean DEFAULT true,
    category_id integer,
    display_order integer DEFAULT 0,
    is_deleted boolean DEFAULT false,
    reviews_count integer DEFAULT 0,
    wallet_balance numeric(10,2) DEFAULT 0.00
);


--
-- Name: restaurants_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.restaurants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: restaurants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.restaurants_id_seq OWNED BY public.restaurants.id;


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reviews (
    id integer NOT NULL,
    user_id integer,
    restaurant_id integer,
    order_id integer,
    rating integer,
    comment text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: reviews_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.reviews_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reviews_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reviews_id_seq OWNED BY public.reviews.id;


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    id integer NOT NULL,
    user_id integer,
    plan_name character varying(50) NOT NULL,
    price numeric(10,2) NOT NULL,
    start_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    end_date timestamp without time zone NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: subscriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.subscriptions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: subscriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.subscriptions_id_seq OWNED BY public.subscriptions.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    phone character varying(15),
    address text,
    password character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    wallet_balance numeric(10,2) DEFAULT 0.00,
    referral_code character varying(20),
    referred_by integer
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: addresses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.addresses ALTER COLUMN id SET DEFAULT nextval('public.addresses_id_seq'::regclass);


--
-- Name: admins id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admins ALTER COLUMN id SET DEFAULT nextval('public.admins_id_seq'::regclass);


--
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);


--
-- Name: drivers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drivers ALTER COLUMN id SET DEFAULT nextval('public.drivers_id_seq'::regclass);


--
-- Name: menu_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_items ALTER COLUMN id SET DEFAULT nextval('public.menu_items_id_seq'::regclass);


--
-- Name: messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages ALTER COLUMN id SET DEFAULT nextval('public.messages_id_seq'::regclass);


--
-- Name: order_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items ALTER COLUMN id SET DEFAULT nextval('public.order_items_id_seq'::regclass);


--
-- Name: orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders ALTER COLUMN id SET DEFAULT nextval('public.orders_id_seq'::regclass);


--
-- Name: payout_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payout_requests ALTER COLUMN id SET DEFAULT nextval('public.payout_requests_id_seq'::regclass);


--
-- Name: restaurants id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restaurants ALTER COLUMN id SET DEFAULT nextval('public.restaurants_id_seq'::regclass);


--
-- Name: reviews id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews ALTER COLUMN id SET DEFAULT nextval('public.reviews_id_seq'::regclass);


--
-- Name: subscriptions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions ALTER COLUMN id SET DEFAULT nextval('public.subscriptions_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: addresses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.addresses (id, user_id, label, address_text, is_default, created_at, latitude, longitude, landmark) FROM stdin;
34	16	Home	2 Kallankuthu Street, Paramakkudi Road	f	2026-04-11 12:22:11.40789	9.766266	78.6396825	
36	16	Home	2, Kallankuthu Street, Paramakkudi Road, Maravamangalam	f	2026-04-11 14:03:13.815545	9.76626564733945	78.63968479229358	
39	16	Home	Kalayarkoil	f	2026-04-21 22:44:45.764881	9.850855825914794	78.62266896545967	
41	16	Home	Managiri-Tirupattur Road, Karaikudi R.F.R[60]C, Tamil Nadu, India	f	2026-04-25 19:28:01.106463	9.850895661800486	78.62267325914794	\N
42	16	Home	Kalayarkoil	f	2026-04-25 20:11:28.620359	9.850895661800486	78.62267325914794	
\.


--
-- Data for Name: admins; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.admins (id, name, phone, password, created_at) FROM stdin;
1	Swiggy Guest	9876543210	$2b$10$TdbthWC33xty./CBAy4pAuvah.rBRTqHXBam6A6jbRjd/yiwiDXGS	2026-04-02 09:44:36.627
2	Arvind	8838374152	$2b$10$JWB8.THFWL0bKVn/z34qPusg9x3N2ouJeK9SuBLetRyCHaE7DdTBe	2026-04-02 09:44:36.627
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.categories (id, name, image_url, veg_type) FROM stdin;
1	Chicken Biryani	https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=200	non-veg
3	Dosa	https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&q=80&w=300&h=300	veg
5	South Indian Meals	photo-1775716437826-714817358	veg
2	Chicken Meals	meals.png	non-veg
4	Chettinad	https://images.unsplash.com/photo-1601050690597-df0568f70950?w=200	veg
7	Idli	photo-1775717086851-939192904	veg
\.


--
-- Data for Name: drivers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.drivers (id, name, phone, password, password_plain, is_online, latitude, longitude, created_at, wallet_balance) FROM stdin;
8	jack	8888888888	$2b$10$RFB.m8cYuf4OLgODBT26Q./H0Y7TDOtCFvNkl1hQu0PtiCMNGoJtq	123	f	10.0848	78.7948	2026-04-09 08:26:50.288	0.00
14	Arasu	1111111111	$2b$10$T0qmkTXZvRJII5DHOklq7.k9C8llA1xYDAQ92Dc2XcWxP3ikMF68q	123	f	9.85085625	78.62267299999999	2026-04-09 09:04:31.945	247.00
15	deepu	2222222222	$2b$10$GrzSbSiQ9e6ZpsyMLXp2r.3UtluVUHcSFHq/Al76MSKIROAvK/FQS	123	t	9.839591	78.634102	2026-04-10 05:34:04.338	254.00
16	arunan	1234567891	$2b$10$8tp0yAimOuzLftZjLeIQa.fGnTKjoNLRFERTFXbMfXMxK846gaLky	123	t	9.766265445085997	78.63968610694103	2026-04-12 20:16:09.272967	0.00
2	Arvind	4444444444	$2b$10$afE6Yz.KNzUhlQdG.1VSleCYoo/9/cyCRx7NFb1w/oVoXzz7RuQim	123	t	9.850895661800486	78.62267325914794	2026-04-02 09:44:36.627	961.00
\.


--
-- Data for Name: favorites; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.favorites (user_id, restaurant_id) FROM stdin;
\.


--
-- Data for Name: menu_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.menu_items (id, restaurant_id, category_id, name, description, price, is_veg, image_url, is_available) FROM stdin;
3	2	3	Ghee Roast Dosa	Crispy dosa made with pure cow ghee	80	t	https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=200	t
7	1	1	south indian meals	south indian meals	250	t	photo-1775037864737-501190593.jpg	t
1	1	1	Chettinad Chicken Biryani	Authentic spicy biryani cooked with seeraga samba rice	230	f	https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=200	t
8	4	1	Mutton Briyani	mutton spiced with briyani	300	f	photo-1776764022378-473273460.jpg	t
9	5	1	Masala Dosa	dosa masala with ghee	70	t	photo-1776764124804-956919880.jpg	t
5	3	4	Veg pulao	veg pulao	90	t	photo-1776851443280-343713506.jpg	t
2	1	4	Pepper Chicken Dry	Spicy Chettinad pepper chicken roast	180	f	photo-1775034908524-622241383.jpg	t
6	1	1	chicken 65	spicy chicken fried 	150	f	photo-1775034882631-453594853.jpg	t
4	2	2	South Indian Meals	Unlimited rice with sambar, rasam, kootu, poriyal	120	t	photo-1776934200787-182503358.jpg	t
10	5	1	veg pulao	pulao	75	t	photo-1776934276016-221327237.jpg	t
11	2	1	veg pulao	pulao	70	t	photo-1776934393033-258101741.jpg	t
12	6	1	chciken briyani	spiced	300	t	photo-1777129807934-121230355.jpg	t
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.messages (id, order_id, sender_type, sender_id, message, created_at) FROM stdin;
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.order_items (id, order_id, menu_item_id, quantity, price) FROM stdin;
29	22	1	2	230
30	22	2	1	180
31	23	6	1	150
32	24	3	3	80
33	24	4	1	120
34	25	5	2	250
35	26	1	1	230
36	27	3	2	80
37	28	6	1	150
38	29	1	2	230
39	30	1	2	230
40	31	2	1	180
41	31	6	1	150
42	31	1	1	230
43	32	2	1	180
44	33	8	1	300
45	34	2	1	180
46	35	4	2	120
47	36	3	1	80
48	37	1	2	230
49	38	12	4	300
50	39	4	9	120
51	40	12	4	300
52	41	12	4	300
53	42	12	4	300
54	43	12	3	300
55	44	12	4	300
56	45	12	1	300
57	46	12	1	300
58	47	12	2	300
59	48	12	3	300
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.orders (id, user_id, restaurant_id, total_amount, status, created_at, driver_id, driver_earnings, delivery_address, customer_name, latitude, longitude, landmark, is_driver_accepted, distance, delivery_fee, handling_fee, platform_commission, payment_method, payment_id, rejected_by, secondary_contact_name, secondary_contact_phone) FROM stdin;
38	16	6	1200	Completed	2026-04-25 22:12:15.555103	15	127	Kalayarkoil	Arun	9.850895661800486	78.62267325914794	\N	t	15.76	0	0	23	COD	\N	{}	niruba	5367829923
33	16	4	585	Completed	2026-04-21 23:28:41.128429	14	247	Kalayarkoil	Arun	9.850855825914794	78.62266896545967	\N	t	30.58	276	9	38	COD	\N	{}	\N	\N
39	16	2	1080	Completed	2026-04-25 22:47:17.421041	16	199	Kalayarkoil	Arun	9.850895661800486	78.62267325914794	\N	t	24.18	0	0	32	COD	\N	{}	\N	\N
35	16	2	525	Ready for Pickup	2026-04-22 14:54:50.47159	\N	247	Kalayarkoil	Arun	9.850855825914794	78.62266896545967	\N	f	30.58	276	9	38	COD	\N	{}	\N	\N
48	16	6	1087	Completed	2026-04-26 19:07:55.434673	2	199	Kalayarkoil	Arun	9.850895661800486	78.62267325914794	\N	t	24.18	178	9	32	COD	\N	{}	\N	\N
40	16	6	1200	Completed	2026-04-25 22:53:50.455159	2	127	Kalayarkoil	Arun	9.850895661800486	78.62267325914794	\N	t	15.76	0	0	23	UPI	pay_mock_ap9h4n	{}	niruba	12233455667
34	16	1	465	Preparing	2026-04-21 23:37:49.822099	14	247	Kalayarkoil	Arun	9.850855825914794	78.62266896545967	\N	t	30.58	276	9	38	COD	\N	{}	\N	\N
36	16	2	365	Completed	2026-04-22 15:11:47.920989	2	247	Kalayarkoil	Arun	9.850855825914794	78.62266896545967	\N	t	30.58	276	9	38	COD	\N	{}	\N	\N
28	16	1	190	Completed	2026-04-11 13:43:30.568574	14	30	2, Kallankuthu Street, Paramakkudi Road, Maravamangalam	Arun	9.766266	78.6396825	\N	t	0.00	0	0	0	COD	\N	{}	\N	\N
41	16	6	1200	Completed	2026-04-26 01:15:23.073889	15	127	Kalayarkoil	Arun	9.850895661800486	78.62267325914794	\N	t	15.76	0	0	23	UPI	pay_mock_0km1t	{}	\N	\N
44	16	6	1200	Completed	2026-04-26 14:38:33.491931	2	127	Kalayarkoil	Arun	9.850895661800486	78.62267325914794	\N	t	15.76	0	0	23	UPI	pay_mock_a5k30o	{}	\N	\N
37	16	1	745	Completed	2026-04-24 21:33:19.79673	14	247	Kalayarkoil	Arun	9.850855825914794	78.62266896545967	\N	t	30.58	276	9	38	COD	\N	{}	\N	\N
29	16	1	500	Completed	2026-04-11 14:03:17.103357	14	30	2, Kallankuthu Street, Paramakkudi Road, Maravamangalam	Arun	9.76626564733945	78.63968479229358	\N	t	0.00	0	0	0	COD	\N	{}	\N	\N
46	16	6	450	Completed	2026-04-26 16:19:01.999348	2	127	Kalayarkoil	Arun	9.850895661800486	78.62267325914794	\N	t	15.76	141	9	23	COD	\N	{}	\N	\N
43	16	6	1022	Completed	2026-04-26 14:17:28.211897	2	127	Kalayarkoil	Arun	9.850895661800486	78.62267325914794	\N	t	15.76	113	9	23	COD	\N	{}	arvind arjun pandiar	67878969556
45	16	6	450	Completed	2026-04-26 15:48:03.920424	2	127	Kalayarkoil	Arun	9.850895661800486	78.62267325914794	\N	t	15.76	141	9	23	UPI	pay_mock_183xlu	{}	\N	\N
22	3	1	640	Completed	2026-04-11 12:37:42.015222	15	0	\N	\N	\N	\N	\N	t	0.00	0	0	0	COD	\N	{}	\N	\N
23	5	1	150	Preparing	2026-04-11 12:37:42.029229	8	0	\N	\N	\N	\N	\N	t	0.00	0	0	0	COD	\N	{}	\N	\N
24	3	2	360	Completed	2026-04-11 12:37:42.032827	15	0	\N	\N	\N	\N	\N	t	0.00	0	0	0	COD	\N	{}	\N	\N
25	3	3	500	Ready for Pickup	2026-04-11 12:37:42.037797	8	0	\N	\N	\N	\N	\N	t	0.00	0	0	0	COD	\N	{}	\N	\N
26	3	4	230	Pending	2026-04-11 12:37:42.040959	\N	0	\N	\N	\N	\N	\N	f	0.00	0	0	0	COD	\N	{}	\N	\N
27	5	2	160	Completed	2026-04-11 12:37:42.043777	15	0	\N	\N	\N	\N	\N	t	0.00	0	0	0	COD	\N	{}	\N	\N
30	16	1	500	Completed	2026-04-12 20:33:00.884501	16	30	2, Kallankuthu Street, Paramakkudi Road, Maravamangalam	Arun	9.76626564733945	78.63968479229358	\N	t	0.00	0	0	0	COD	\N	{}	\N	\N
42	16	6	1200	Completed	2026-04-26 11:27:37.989181	2	127	Kalayarkoil	Arun	9.850895661800486	78.62267325914794	\N	t	15.76	0	0	23	COD	\N	{16}	arvind arjun pandiar	34455666678
47	16	6	750	Completed	2026-04-26 18:00:17.106231	2	127	Kalayarkoil	Arun	9.850895661800486	78.62267325914794	\N	t	15.76	141	9	23	COD	\N	{}	\N	\N
31	16	1	845	Completed	2026-04-20 21:00:33.938244	14	247	Kalayarkoil	Arun	9.850895661800486	78.62267325914794	\N	t	30.58	276	9	39	COD	\N	{}	\N	\N
32	16	1	465	Completed	2026-04-21 13:48:10.331283	14	247	Kalayarkoil	Arun	9.850895661800486	78.62267325914794	\N	t	30.58	276	9	38	COD	\N	{}	\N	\N
\.


--
-- Data for Name: payout_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payout_requests (id, user_type, user_id, amount, status, requested_at, processed_at) FROM stdin;
\.


--
-- Data for Name: restaurants; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.restaurants (id, name, image_url, rating, delivery_time, is_veg_only, cost_for_two, password, cuisines, address, latitude, longitude, login_id, password_plain, is_active, category_id, display_order, is_deleted, reviews_count, wallet_balance) FROM stdin;
3	Karaikudi Annalakshmi	https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400	4.2	40-45 mins	f	350	$2b$10$TdbthWC33xty./CBAy4pAuvah.rBRTqHXBam6A6jbRjd/yiwiDXGS	Chettinad, Multi-Cuisine	College Rd, Alagappapuram, Karaikudi, Tamil Nadu 630003	10.0748	78.7848	karaikudi_annalakshmi_3	\N	t	\N	3	f	0	0.00
2	Annapoorna Veg	https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400	4.8	20-25 mins	t	200	$2b$10$NC76.EnBb5SHtxvxB6FhvOyH/UrFO2Dv7FecKkK3/1y5zvGWLzUR.	South Indian, Pure Veg	Devakottai, Tamil Nadu, India	9.9554422	78.8162334	2	123	t	\N	2	f	0	0.00
5	kallal hotel	photo-1776513055484-782846508	4.5	30-35 mins	t	400	$2b$10$cHvOo8rfWLXSQnIgttS/4OaUo9LCJa9UyZARnnznJQHTkD72HYxq2		Kallal, Tamil Nadu 630305, India	9.9821	78.6568	5	123	t	5	4	f	0	0.00
4	Buhari Hotel	https://images.unsplash.com/photo-1552566626-52f8b828add9?w=400	4.0	25-30 mins	f	300	$2b$10$yqwwySpORDbbFrIvRRsgPuSbv6D5eXxb7CtEy78UiWDuRghgUm6HW	Non-Veg, Biryani	Subramaniapuram, Karaikudi, Tamil Nadu 630002	10.0748	78.7848	4	123	t	\N	1	f	0	0.00
6	mangalam hotel		4.8	32 mins	f	400	$2b$10$Vlm1fl7gI2CoFMXmY.ouwOA8EC8wMyPsZ3DB.VEkLCjg1tLAZnmei		Devakottai, Tamil Nadu, India	9.9554422	78.8162334	6	123	t	\N	0	f	0	6993.00
1	Sri Meyyappa Chettinad	https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400	4.5	30-35 mins	f	400	$2b$10$qF.nX.d1JX5UVawCibsMeOT0dhonFqUsX070No2dIhhhcLEesomGK	Chettinad, Non-Veg	Alagappapuram, Karaikudi, Tamil Nadu 630003	10.0748	78.7848	1	123	t	\N	0	f	0	431.00
\.


--
-- Data for Name: reviews; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.reviews (id, user_id, restaurant_id, order_id, rating, comment, created_at) FROM stdin;
\.


--
-- Data for Name: subscriptions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.subscriptions (id, user_id, plan_name, price, start_date, end_date, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, name, phone, address, password, created_at, wallet_balance, referral_code, referred_by) FROM stdin;
3	Test User	9999999999	Test Address	$2b$10$7u7mVSadH0KCng1sOaD8a.9z3ONKEdi.fKExDOw4bS54vtJpy85.O	2026-04-03 06:46:43.691	0.00	REF3DTP0X	\N
5	Sachin	9360095812	Karaikudi new bus stand 	$2b$10$CfdyEI9uBpfg7zkljxFrzeNpIFvCBceVQ0iBo4eYZf1RdAOoXo3qC	2026-04-03 08:52:52.835	0.00	REF5ZN7LMR	\N
4	Test User	1234567890	Test Address	$2b$10$6.Lro6NGOBCOvrxHMRLG0er7MNapVQIe2Rp7a3.6HC2YuqXedhvoa	2026-04-03 07:44:45.855	0.00	REF4QFRHTY	\N
16	Arun	1111111111	3258	$2b$10$rekrHTOyWDZL3GKS/0ocVerTkWG8LJbMI46CcO2NBHJkvGQVktob2	2026-04-11 12:17:43.362747	0.00	REF164X4605	\N
\.


--
-- Name: addresses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.addresses_id_seq', 42, true);


--
-- Name: admins_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.admins_id_seq', 2, true);


--
-- Name: categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.categories_id_seq', 7, true);


--
-- Name: drivers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.drivers_id_seq', 16, true);


--
-- Name: menu_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.menu_items_id_seq', 12, true);


--
-- Name: messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.messages_id_seq', 1, false);


--
-- Name: order_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.order_items_id_seq', 59, true);


--
-- Name: orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.orders_id_seq', 48, true);


--
-- Name: payout_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.payout_requests_id_seq', 1, false);


--
-- Name: restaurants_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.restaurants_id_seq', 6, true);


--
-- Name: reviews_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.reviews_id_seq', 1, false);


--
-- Name: subscriptions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.subscriptions_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 16, true);


--
-- Name: addresses addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.addresses
    ADD CONSTRAINT addresses_pkey PRIMARY KEY (id);


--
-- Name: admins admins_phone_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_phone_key UNIQUE (phone);


--
-- Name: admins admins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: drivers drivers_phone_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drivers
    ADD CONSTRAINT drivers_phone_key UNIQUE (phone);


--
-- Name: drivers drivers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drivers
    ADD CONSTRAINT drivers_pkey PRIMARY KEY (id);


--
-- Name: favorites favorites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_pkey PRIMARY KEY (user_id, restaurant_id);


--
-- Name: menu_items menu_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: payout_requests payout_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payout_requests
    ADD CONSTRAINT payout_requests_pkey PRIMARY KEY (id);


--
-- Name: restaurants restaurants_login_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restaurants
    ADD CONSTRAINT restaurants_login_id_key UNIQUE (login_id);


--
-- Name: restaurants restaurants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restaurants
    ADD CONSTRAINT restaurants_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_order_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_order_id_key UNIQUE (order_id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_referral_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_referral_code_key UNIQUE (referral_code);


--
-- Name: addresses addresses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.addresses
    ADD CONSTRAINT addresses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: favorites favorites_restaurant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;


--
-- Name: favorites favorites_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: menu_items menu_items_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: menu_items menu_items_restaurant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;


--
-- Name: messages messages_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: order_items order_items_menu_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id);


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: orders orders_driver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.drivers(id) ON DELETE SET NULL;


--
-- Name: orders orders_restaurant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_restaurant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: users users_referred_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_referred_by_fkey FOREIGN KEY (referred_by) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

\unrestrict vheeAQrXaqzEZXZtcU00M2rDAzW6IdamnqF0U7mvIc3TVQxYXq5NlcKiMN5Vvmr

